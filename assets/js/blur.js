var content = document.querySelector('.content');
var duplicate = content.cloneNode(true);
var contentBlurred = document.createElement('div');
contentBlurred.className = 'content-blurred';
contentBlurred.appendChild(duplicate);

var header = document.querySelector('header');
var headerContainer = document.querySelector('.headerContainer');
header.insertBefore(contentBlurred, headerContainer);

window.onscroll = function(){
	var t = document.documentElement.scrollTop || document.body.scrollTop;
	translation = 'translate3d(0,' + (-t + 'px') + ',0)';
  duplicate.style['-webkit-transform'] = translation;
  duplicate.style['-moz-transform'] = translation;
  duplicate.style['transform'] = translation;
}