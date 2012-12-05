local_plugins();

function local_plugins(){
	/* Simple JavaScript Inheritance
	 * By John Resig http://ejohn.org/
	 * MIT Licensed.
	 */
	// Inspired by base2 and Prototype
	(function(){
	  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
	  // The base Class implementation (does nothing)
	  this.Class = function(){};
	  
	  // Create a new Class that inherits from this class
	  Class.extend = function(prop) {
		var _super = this.prototype;
		
		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		var prototype = new this();
		initializing = false;
		
		// Copy the properties over onto the new prototype
		for (var name in prop) {
		  // Check if we're overwriting an existing function
		  prototype[name] = typeof prop[name] == "function" && 
			typeof _super[name] == "function" && fnTest.test(prop[name]) ?
			(function(name, fn){
			  return function() {
				var tmp = this._super;
				
				// Add a new ._super() method that is the same method
				// but on the super-class
				this._super = _super[name];
				
				// The method only need to be bound temporarily, so we
				// remove it when we're done executing
				var ret = fn.apply(this, arguments);        
				this._super = tmp;
				
				return ret;
			  };
			})(name, prop[name]) :
			prop[name];
		}
		
		// The dummy class constructor
		function Class() {
		  // All construction is actually done in the init method
		  if ( !initializing && this.init )
			this.init.apply(this, arguments);
		}
		
		// Populate our constructed prototype object
		Class.prototype = prototype;
		
		// Enforce the constructor to be what we expect
		Class.prototype.constructor = Class;

		// And make this class extendable
		Class.extend = arguments.callee;
		
		return Class;
	  };
	})();
	
	(function($) {
		$.fn.hasScrollBar = function() {
			if (this.is('body')){
				return this.height() > $(window).height();
			}
			else{
				return this.get(0).scrollHeight > this.height();
			}
		}
	})(jQuery);

	
	(function($) {
		$.fn.getRealRect = function() {
			if (typeof this.get(0) != "undefined"){
				var rect = this.get(0).getBoundingClientRect();
			
				return {
					bottom: rect.bottom + $(window).scrollTop(),
					height: rect.height,
					left: rect.left + $(window).scrollLeft(),
					right: rect.right + $(window).scrollLeft(),
					top: rect.top + $(window).scrollTop(),
					width: rect.width				
				};
			}
			else{
				return {
					bottom: 0,
					height: 0,
					left: 0,
					right: 0,
					top: 0,
					width: 0				
				};
			}
		}
	})(jQuery);
	

    /*time from seconds creates the hour, minutes, seconds representation from
     * seconds
     */
   (function( $ ) {
      $.fn.time_from_seconds = function() {
        return this.each(function() {
            var t = parseInt($(this).text(), 10);
            $(this).data('original', t);
            var h = Math.floor(t / 3600);
            t %= 3600;
            var m = Math.floor(t / 60);
            var s = Math.floor(t % 60);
            $(this).text((h > 0 ? h + 'h' + ((h > 1) ? ' ' : ' ') : '') +
                         (m > 0 ? m + 'm' + ((m > 1) ? ' ' : ' ') : '') +
                         (s > 0 ? s + 's' + ((s > 1) ? ' ' : '') : ''));

        });
     };
    })( jQuery );

    (function( $ ) {
      $.time_from_seconds = function(original) {
            var t = parseInt(original);
            var h = Math.floor(t / 3600);
            t %= 3600;
            var m = Math.floor(t / 60);
            var s = Math.floor(t % 60);
            var return_text = (h > 0 ? h + 'h' + ((h > 1) ? ' ' : ' ') : '') +
                         (m > 0 ? m + 'm' + ((m > 1) ? ' ' : ' ') : '') +
                         s + 's' + ((s > 1) ? '' : '');

            return return_text;
     };
    })( jQuery );
	
	jQuery.fn.watch = function( id, fn ) {
 
		return this.each(function(){
	 
			var self = this;
	 
			var oldVal = self[id];
			$(self).data(
				'watch_timer',
				setInterval(function(){
					if (self[id] !== oldVal) {
						fn.call(self, id, oldVal, self[id]);
						oldVal = self[id];
					}
				}, 100)
			);
	 
		});
 
		return self;
	};
	 
	jQuery.fn.unwatch = function( id ) {
	 
		return this.each(function(){
			clearInterval( $(this).data('watch_timer') );
		});
	 
	};
	
	jQuery.fn.valuechange = function(fn) {
		return this.bind('valuechange', fn);
	};
	 
	jQuery.event.special.valuechange = {
	 
		setup: function() {
	 
			jQuery(this).watch('value', function(){
				jQuery.event.handle.call(this, {type:'valuechange'});
			});
	 
		},
	 
		teardown: function() {
			jQuery(this).unwatch('value');
		}
	 
	};
	
	/*
	* return items in the main array that aren't in the second array
	*/
	(function( $ ) {
		$.fn.diff = function(a2) {
			items = jQuery.grep(this,function (item) {
				return jQuery.inArray(item, a2) < 0;
			});
			return items;
		}
    })( jQuery );
	
	/**
	*http://james.padolsey.com/javascript/regex-selector-for-jquery/
	*/
		
	/**
	*
	* http://james.padolsey.com/javascript/extending-jquerys-selector-capabilities/
	*/
	// Wrap in self-invoking anonymous function:
	(function($){
	 
		// Extend jQuery's native ':'
		$.extend($.expr[':'],{
	 
			// New method, "data"
			data: function(a,i,m) {
	 
				var e = $(a).get(0), keyVal;
	 
				// m[3] refers to value inside parenthesis (if existing) e.g. :data(___)
				if(!m[3]) {
	 
					// Loop through properties of element object, find any jquery references:
					for (var x in e) { if((/jQuery\d+/).test(x)) { return true; } }
	 
				} else {
	 
					// Split into array (name,value):
					keyVal = m[3].split('=');
	 
					// If a value is specified:
					if (keyVal[1]) {
	 
						// Test for regex syntax and test against it:
						if((/^\/.+\/([mig]+)?$/).test(keyVal[1])) {
							return
							 (new RegExp(
								 keyVal[1].substr(1,keyVal[1].lastIndexOf('/')-1),
								 keyVal[1].substr(keyVal[1].lastIndexOf('/')+1))
							  ).test($(a).data(keyVal[0]));
						} else {
							// Test key against value:
							return $(a).data(keyVal[0]) == keyVal[1];
						}
	 
					} else {
	 
						// Test if element has data property:
						if($(a).data(keyVal[0])) {
							return true;
						} else {
							// If it doesn't remove data (this is to account for what seems
							// to be a bug in jQuery):
							$(a).removeData(keyVal[0]);
							return false;
						}
	 
					}
				}
	 
				// Strict compliance:
				return false;
	 
			},
			
			regex: function(elem, index, match) {
				var matchParams = match[3].split(','),
					validLabels = /^(data|css):/,
					attr = {
						method: matchParams[0].match(validLabels) ? 
									matchParams[0].split(':')[0] : 'attr',
						property: matchParams.shift().replace(validLabels,'')
					},
					regexFlags = 'ig',
					regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g,''), regexFlags);
				return regex.test(jQuery(elem)[attr.method](attr.property));
			}
	 
		});
	})(jQuery);
	
	jQuery.fn.removeFromArray = function(value) {
		var array = jQuery.grep(this, function(elem, index) {
			return elem !== value;
		});
		
		return $(array);
	};
	
	//hashchange
	(function($,e,b){var c="hashchange",h=document,f,g=$.event.special,i=h.documentMode,d="on"+c in e&&(i===b||i>7);function a(j){j=j||location.href;return"#"+j.replace(/^[^#]*#?(.*)$/,"$1")}$.fn[c]=function(j){return j?this.bind(c,j):this.trigger(c)};$.fn[c].delay=50;g[c]=$.extend(g[c],{setup:function(){if(d){return false}$(f.start)},teardown:function(){if(d){return false}$(f.stop)}});f=(function(){var j={},p,m=a(),k=function(q){return q},l=k,o=k;j.start=function(){p||n()};j.stop=function(){p&&clearTimeout(p);p=b};function n(){var r=a(),q=o(m);if(r!==m){l(m=r,q);$(e).trigger(c)}else{if(q!==m){location.href=location.href.replace(/#.*/,"")+q}}p=setTimeout(n,$.fn[c].delay)}$.browser.msie&&!d&&(function(){var q,r;j.start=function(){if(!q){r=$.fn[c].src;r=r&&r+a();q=$('<iframe tabindex="-1" title="empty"/>').hide().one("load",function(){r||l(a());n()}).attr("src",r||"javascript:0").insertAfter("body")[0].contentWindow;h.onpropertychange=function(){try{if(event.propertyName==="title"){q.document.title=h.title}}catch(s){}}}};j.stop=k;o=function(){return a(q.location.href)};l=function(v,s){var u=q.document,t=$.fn[c].domain;if(v!==s){u.title=h.title;u.open();t&&u.write('<script>document.domain="'+t+'"<\/script>');u.close();q.location.hash=v}}})();return j})()})(jQuery,this);
}