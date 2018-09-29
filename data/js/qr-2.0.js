/**
 * === JavaScript QR Code  ===
 * Contributors for this file: UlmDesign - Francesco De Stefano
 * Tags: qr code, qr code js, qr code javascript, qr code generator, qr code maker
 * Release: 2.0.1 - 2018 UlmDesign - http://mediamaster.eu
 * License: GPL 3.0 or later
 * License: URI: http://www.gnu.org/copyleft/gpl.html
 * Description: Convert text or url to QR Code in JavaScript
 *
 * */

var qrgchart = {} || qrgchart, qrimage = document.createElement("img");

qrgchart.getQRCode = function(getidqr, setWidth, setHeight, setcontent) {
  try{
    var containerqrimage = document.getElementById(getidqr), stringqr = "https://chart.apis.google.com/chart?cht=qr&chs=" + setWidth + "x" + setHeight + "&chl=" + encodeURIComponent(setcontent);
    this.empty(containerqrimage);
    qrimage.setAttribute("id", "imgchart");
    qrimage.src = stringqr.replace(/&amp;/g, '&');
    containerqrimage.appendChild(qrimage);
    return[getidqr, setWidth, setHeight, setcontent];
  } catch(e){
    alert("Error description " + e.message);
  }
}

qrgchart.standardimQR = function(idcontainer){
  var myDiv = document.getElementById(idcontainer);
  var array = ["300","50","100","125","150","175","200","225","250","275","325","350","400","425","450","475","500"];
  var selectList = document.createElement("select");
  selectList.id = "setdim";
  myDiv.appendChild(selectList);
  for (var i = 0; i < array.length; i++) {
      var option = document.createElement("option");
      option.value = array[i];
      option.textContent = array[i];
      selectList.appendChild(option);
  }
}
qrgchart.empty = function(element){
  return element;
}
qrgchart.getQRimg = function(idareaCode, getidqr) {
  var txtArea = document.getElementById(idareaCode), containerqrimage = document.getElementById(getidqr), qrhtml = decodeURIComponent('<img src="https://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(document.getElementsByTagName('img')[0].src.split("=")[3]) + '"/>');
  txtArea.value = qrhtml.replace(/&amp;/g, '&');
  txtArea.select();
  return [idareaCode, getidqr];
}
qrgchart.shareQRimg = function(getidqr){
    var subject = prompt("Enter subject email, please");
    var containerqrimage = document.getElementById(getidqr);
    var a = "mailto:me@example.com?cc=myCCaddress@example.com&subject=" + encodeURIComponent(subject) + "&body=" + decodeURIComponent('<img src="https://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(document.getElementsByTagName('img')[0].src.split("=")[3]) + '"/>');
    if (subject === null || subject === '') {
    return false;
  } else {
    return window.location.href = a;
  }
}
