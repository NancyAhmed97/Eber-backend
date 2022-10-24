// var BASE_URL = "http://localhost:5000/";
var BASE_URL = "https://eberdeveloper.appemporio.net/";

var style_link = document.createElement('link');
style_link.rel = "stylesheet"
style_link.type = "text/css"
style_link.href = BASE_URL + "new_design/css/guest-token-load.css"

var main_iframe_container = document.getElementsByClassName('eber-iframe-container');
if(main_iframe_container[0]){
	main_iframe_container = main_iframe_container[0];
	document.body.appendChild(style_link);
	main_iframe_container.insertAdjacentHTML('beforeend', '<a href="javascript:;" onclick="showFrameContainer()" class="float-iframe-btn"><i class="fa fa-paper-plane my-float-iframe-btn" aria-hidden="true"></i></a>');
	main_iframe_container.insertAdjacentHTML('beforeend', '<div id="iframe-container"><div>');
    var div_iframe_container = document.getElementById('iframe-container');

    var this_js_script = document.querySelector('script[src*="guest-token-load.js"]');
    var token = this_js_script.getAttribute('data-token');
    
	var iframe = document.createElement('iframe');
    div_iframe_container.appendChild(iframe);
	iframe.src = BASE_URL + "guest-user?token=" + token;
    iframe.width = '100%';
    iframe.height = '100%';
	iframe.allowFullscreen = "true";
    iframe.id = 'guest-token-iframe';

    function showFrameContainer(){
		var iframe = document.getElementById("iframe-container");
		iframe.classList.toggle("show");

		var float_button = document.getElementsByClassName("my-float-iframe-btn");
		float_button[0].classList.toggle("fa-times")
		float_button[0].classList.toggle("fa-paper-plane")
		
		var float_iframe_button = document.getElementsByClassName("float-iframe-btn");
		float_iframe_button[0].classList.toggle("btn-active")
    }
}