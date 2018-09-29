var divqr = document.getElementById("containerqr");
function makeQRCODE(){
  var inputqr = document.getElementById("texttoqr").value;
  var setdim = document.getElementById("setdim").value;
  divqr.style.textAlign = 'center';
  if(inputqr === "") {
    document.getElementById('texttoqr').placeholder = 'Enter text to get QR code, please';
  } else {
    qrgchart.empty(document.getElementById("sharebtns"));
    qrgchart.getQRCode("containerqr", setdim, setdim, inputqr);
  }
}

function init(){
  qrgchart.standardimQR("dimensionqr");
  var txtUrl = decodeURIComponent(window.location.hash.substring(1));
  document.getElementById("texttoqr").value = txtUrl;
  qrgchart.getQRCode("containerqr", "300", "300", txtUrl);
  qrgchart.getQRimg("getcode", "containerqr");
  document.getElementById("btnmakeqr").click();
  document.getElementById("containerqr").style.textAlign = 'center';
}

function getTaghtml(){
   makeQRCODE();
   return qrgchart.getQRimg("getcode", "containerqr");
}
function shareQRemail(){
  qrgchart.shareQRimg("containerqr");
}

function printQRCode(){
	qrgchart.printgcp("myQRCode" + new Date(), qrimage.src);
}
document.getElementById('printqrpaper').addEventListener('click', function(){
  window.print()
}, false);
document.addEventListener("DOMContentLoaded", init, false);
document.getElementById("sharechart").addEventListener("click", shareQRemail, false);
document.getElementById("btnmakeqr").addEventListener("click", getTaghtml, false);
