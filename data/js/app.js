(function(){
    var str = decodeURIComponent(window.location.hash.substring(1));
    var sourceStrElement =  document.getElementById('sourceStr');
    var resultElement =  document.getElementById('result');
    sourceStrElement.innerText = str;
    new QRCode(resultElement, str);
})();
