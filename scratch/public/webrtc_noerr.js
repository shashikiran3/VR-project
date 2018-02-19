/** browser dependent definition are aligned to one and the same standard name **/
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition 
  || window.msSpeechRecognition || window.oSpeechRecognition;

var config = {
  //wssHost: 'wss://wotpal.club'
  wssHost: 'wss://oasys-lab.isi.edu:3000/'
};
var localVideoElem = null, 
  remoteVideoElem = null, 
  localVideoStream = null,
  videoCallButton = null, 
  endCallButton = null;
var peerConn = null,
  wsc = new WebSocket(config.wssHost),
  peerConnCfg = {'iceServers': 
    [{'url': 'stun:stun.services.mozilla.com'}, 
     {'url': 'stun:stun.l.google.com:19302'}]
  };
    
function pageReady() {
  // check browser WebRTC availability 
  if(navigator.getUserMedia) {
    videoCallButton = document.getElementById("videoCallButton");
    endCallButton = document.getElementById("endCallButton");
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    videoCallButton.removeAttribute("disabled");
    videoCallButton.addEventListener("click", initiateCall);
    endCallButton.addEventListener("click", function (evt) {
      wsc.send(JSON.stringify({"closeConnection": true }));
    });
  } else {
    alert("Sorry, your browser does not support WebRTC!")
  }
};

function prepareCall() {
  peerConn = new RTCPeerConnection(peerConnCfg);
  // send any ice candidates to the other peer
  console.log(" send any ice candidates to the other peer");
  peerConn.onicecandidate = onIceCandidateHandler;
  // once remote stream arrives, show it in the remote video element
  peerConn.onaddstream = onAddStreamHandler;
  console.log("once remote stream arrives, show it in the remote video element");
};

// run start(true) to initiate a call
function initiateCall() {
  prepareCall();
  // get the local stream, show it in the local video element and send it
  navigator.getUserMedia({ "audio": true, "video": true }, function (stream) {
    localVideoStream = stream;
    localVideo.src = URL.createObjectURL(localVideoStream);
    peerConn.addStream(localVideoStream);
    createAndSendOffer();
  }, function(error) { console.log(error);});
};

function answerCall() {
 console.log("inside answer call");
  prepareCall();
  // get the local stream, show it in the local video element and send it
  navigator.getUserMedia({ "audio": true, "video": true }, function (stream) {
    localVideoStream = stream;
    localVideo.src = URL.createObjectURL(localVideoStream);
    peerConn.addStream(localVideoStream);
     console.log(signal);
     
      console.log("got the singal in the answer call function");
      console.log(signal.sdp);
      peerConn.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function(){console.log("Hey I am here")});
     
     createAndSendAnswer();
  }, function(error) { console.log(error);});
};

wsc.onmessage = function (evt) {
  var signal_local = null;
    console.log("inside wsc.onmessage");
    signal_local = JSON.parse(evt.data);
  //if (!peerConn) answerCall();
  
   //var pc2 = new RTCPeerConnection(peerConnCfg);
   console.log(signal_local);



   console.log("parsing");
   //pc2.onicecandidate = onIceCandidateHandler;
  
   
    if (signal_local.sdp) {
    console.log("assigned signal to local_signal");
     signal = signal_local;
    if (!peerConn) answerCall();
     //aPromise = pc2.setRemoteDescription(new RTCSessionDescription(signal_local.sdp)).then(function(){console.log("Hey I am here")});
  }
  else if (signal_local.candidate) {
    console.log("Received ICECandidate from remote peer.");
     if(peerConn.remoteDescription.type){
       console.log("Received remote peer."); 
       peerConn.addIceCandidate(new RTCIceCandidate(signal_local.candidate));
   }
  
   console.log("after ICE CANDIDATE");
  } 
   else if ( signal_local.closeConnection){
    console.log("Received 'close call' signal from remote peer.");
    endCall();
  }

};

function createAndSendOffer() {
  peerConn.createOffer(
    function (offer) {
      var off = new RTCSessionDescription(offer);
      peerConn.setLocalDescription(new RTCSessionDescription(off), 
        function() {
          wsc.send(JSON.stringify({"sdp": off }));
        }, 
        function(error) { console.log(error);}
      );
    }, 
    function (error) { console.log(error);}
  );
};

function createAndSendAnswer() {
  peerConn.createAnswer(
    function (answer) {
      var ans = new RTCSessionDescription(answer);
      peerConn.setLocalDescription(ans, function() {
          wsc.send(JSON.stringify({"sdp": ans }));
        }, 
        function (error) { console.log(error);}
      );
    },
    function (error) {console.log(error);}
  );
};

function onIceCandidateHandler(evt) {
  if (!evt || !evt.candidate) return;
  wsc.send(JSON.stringify({"candidate": evt.candidate }));
};

function onAddStreamHandler(evt) {
  videoCallButton.setAttribute("disabled", true);
  endCallButton.removeAttribute("disabled"); 
  // set remote video stream as source for remote video HTML5 element
  remoteVideo.src = URL.createObjectURL(evt.stream);
};

function endCall() {
  peerConn.close();
  peerConn = null;
  videoCallButton.removeAttribute("disabled");
  endCallButton.setAttribute("disabled", true);
  if (localVideoStream) {
    localVideoStream.getTracks().forEach(function (track) {
      track.stop();
    });
    localVideo.src = "";
  }
  if (remoteVideo) remoteVideo.src = "";
};
