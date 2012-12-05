var util = {
 
	//get all unique links in the page
    //get only visible links with size
	getPageLinks: function(){
		var links = $.unique($($('a[href]:visible')).filter(
			function(i,l){
				var k = $(l);
				if (l.href.indexOf('http')==0 && k.height()>0 && k.width()>0 && k.css('visibility')!='hidden'){return true;}
				else{return false;}
			}
		).not($(':regex(class,^webwear)')));
		
		return links;
	},
	
	// findPos() by quirksmode.org
	// Finds the absolute position of an element on a page
	findPos: function(obj) {
		var curleft = curtop = 0;
        if (obj.offset && obj.offset()) {	
			do {
                if (obj.offset && obj.offset()){
                    curleft += obj.offset().left;
                    curtop += obj.offset().top;	
                }
                obj = obj.parent();
            } while (obj.offset());
		}
		return {left: curleft, top: curtop};
	},
 
	// getPageScroll() by quirksmode.org
	// Finds the scroll position of a page
	getPageScroll: function() {
		var xScroll, yScroll;
		if (self.pageYOffset) {
			yScroll = self.pageYOffset;
			xScroll = self.pageXOffset;
		} else if (document.documentElement && document.documentElement.scrollTop) {
			yScroll = document.documentElement.scrollTop;
			xScroll = document.documentElement.scrollLeft;
		} else if (document.body) {// all other Explorers
			yScroll = document.body.scrollTop;
			xScroll = document.body.scrollLeft;
		}
        return {left: xScroll, top: yScroll};
	},
 
	// Finds the position of an element relative to the viewport.
	findPosRelativeToViewport: function(obj) {
        //var objPos = this.findPos(obj);
        var objPos = obj.position();
        var scroll = this.getPageScroll();
        return { left: objPos.left - scroll.left, top: objPos.top - scroll.top}; 
	},
	
	//returns the filename aprt of the url
	parseFileName: function(url){
		var tempPage = url;

		var lastIndex = (url.lastIndexOf('?')==-1)? url.length : url.lastIndexOf('?');
			
		//just get the filename part for now
		var currentPage = url.substring(
				url.lastIndexOf('/')+1, lastIndex);
	
		return currentPage;
	},
	
	//returns the domain part of the url
	parseDomain: function(url){
		var currentDomain = '';
		
		var urlpattern = new RegExp("(http|ftp|https)://(.*?)/(.*$)");
		var parsedurl = url.match(urlpattern);
		
		//test to see if the link is a Google search result... if it is, extract the real link
		if (parsedurl && parsedurl[2].indexOf('.google.') != -1 && parsedurl[3] && parsedurl[3].search(/^url?/) != -1){
			var newUrl = parsedurl[3].substring(parsedurl[3].indexOf('url=')+4);
			
			if (newUrl.indexOf('&') != -1){
				newUrl = newUrl.substring(0,newUrl.indexOf('&'));
			}
			if (newUrl.indexOf('#') != -1){
				newUrl = newUrl.substring(0,newUrl.indexOf('#'));
			}
			
			newUrl = decodeURIComponent(newUrl);
			
			url = newUrl;
			
			parsedurl = url.match(urlpattern);
		}
		
		
		if (!parsedurl || !parsedurl.length >= 3){
			urlpattern = new RegExp("(http|ftp|https)://(.*?)");
			parsedurl = url.match(urlpattern);
		}
		
		if (parsedurl && parsedurl.length >= 3){
			var count = 0;
			var dots = parsedurl[2].match(/\./g);
			
			if (dots){
				var count = dots.length;
			}
			else{
				if (WebWearDebug) console.log(url);
			}
						
			if (count > 1){
				return parsedurl[2].substring(parsedurl[2].indexOf('.')+1);
			}
			
			else return parsedurl[2];
			
		}
			
		else{
			return null;
		}
		
	},
	
	//returns the domain part of the url
	parseCleanUrl: function(url){
		url = decodeURI(url);
	
		var currentDomain = '';
		var filename = '';
		
		var urlpattern = new RegExp("(http|ftp|https)://(.*?)/(.*$)");
		var parsedurl = url.match(urlpattern);
				
				
		//test to see if the link is a Google search result... if it is, extract the real link
		if (parsedurl && parsedurl[2].indexOf('.google.') != -1 && parsedurl[3].search(/^url?/) != -1){
			var newUrl = parsedurl[3].substring(parsedurl[3].indexOf('url=')+4);
			
			if (newUrl.indexOf('&') != -1){
				newUrl = newUrl.substring(0,newUrl.indexOf('&'));
			}
			if (newUrl.indexOf('#') != -1){
				newUrl = newUrl.substring(0,newUrl.indexOf('#'));
			}
			
			newUrl = decodeURIComponent(newUrl);
			
			url = newUrl;
			
			parsedurl = url.match(urlpattern);
		}
				
				
		
		if (parsedurl && parsedurl.length >= 4){
						
			//treat special pages differently
			var removeQueryString = false;	//flag for websites to remove query string
			
			//test if its a google search page
			if (parsedurl[2].indexOf('.google.') != -1 ){
				removeQueryString = true;
				
				//replace common google search pages with a catch all
				parsedurl[3] = parsedurl[3].replace(/^webhp/,"search");
				parsedurl[3] = parsedurl[3].replace(/^\?/,"search?");
				
				
			}			
			
			//test if its a google search page
			if (parsedurl[2].indexOf('.bing.com') != -1 ){
				removeQueryString = true;			
			}
			
			//remove hashtag first 
			var hasTagPos = parsedurl[3].indexOf('#');
			
			
			//remove the query string iff there is a query param (i.e., "q=") in the string
			
			//get query string from the url
			var queryString = util.parseQueryParam(url);
			
			if (removeQueryString && queryString != ''){

				//get the potential query string start position
				//google sometimes uses a hash tag as a query string... bastards
				var queryStringPos = (parsedurl[3].indexOf('?') != -1) ? parsedurl[3].indexOf('?'):parsedurl[3].indexOf('#');
										
				
				//get query string from the url
				var queryString = util.parseQueryParam(url);
				
				//check for query string
				if (queryStringPos != -1){
					
					//if ends with a slash after query string removed... make filename index.html
					if (queryStringPos === 0 || parsedurl[3].substring(0,queryStringPos).lastIndexOf('/')+1 === parsedurl[3].length){
						filename += 'index.html';
					}
					
					filename += parsedurl[3].substring(0,queryStringPos);
				}
			
				else{
					filename += parsedurl[3];
				}
							
				
				filename += '?q='+queryString;
			}
			else{
				//remove hashtag if there is one
				var hashPos = parsedurl[3].indexOf('#');
				if (hashPos != -1){
					parsedurl[3].substring(0,hashPos)
				}
				
				//add index.html if ends with slash
				if (parsedurl[3].length === 0 || parsedurl[3].lastIndexOf('/')+1 === parsedurl[3].length){
						parsedurl[3] += 'index.html';
				}
				
				filename += parsedurl[3];
			}
				
			
							
			if (filename.length>0)
				return parsedurl[2]+'/'+filename;
			else
				return parsedurl[2];
			
		}
				
		else if (parsedurl && parsedurl.length >=3){
			return parsedurl[2];
		}
		
		else return null;
	},
    //remove the query string and  hash tag
	parseWithoutQueryString: function(url){
		var queryParamPos = url.indexOf('?');
		if (queryParamPos != -1){
			url = url.substring(0,queryParamPos);
		}
		
		var hashPos = url.indexOf('#');
		if (hashPos != -1){
			url = url.substring(0,hashPos);
		}
		
		return url;
	},
	//get the query param (q=...) from the url or return empty
	parseQueryParam: function(url){
		//does the page contain a query?
		var queryString = '';
		var queryParamPos = url.indexOf('?q=');
		if (queryParamPos == -1){ queryParamPos = url.indexOf('&q=');}
					
		if (queryParamPos != -1){
		
			//now get the the query string
			queryString = url.substring(queryParamPos+3);
	
			if (queryString.indexOf('&') != -1){
				
				if (queryString.indexOf('&')===0){
					queryString = queryString.substring(4);
				}						
				if (queryString.indexOf('&') != -1){
					queryString = queryString.substring(0,queryString.indexOf('&'));
				}
				
			}
			
			if (queryString.indexOf('#') != -1){
				queryString = queryString.substring(0,queryString.indexOf('#'));
			}
		}
				
		return queryString;
					
	},	
	
	//returns the domain part of the url
	parseFullDomain: function(url){
		var currentDomain = '';
		
		var urlpattern = new RegExp("(http|ftp|https)://(.*?)/.*$");
		var parsedurl = url.match(urlpattern);
		
		
		if (parsedurl && parsedurl.length >= 2){
			return parsedurl[2];
		}
			
		else{
					
			return null;
		}
		
	},
	
	//get how many days ago a date was
	daysAgo: function(pastDate){
		var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
				 
		var diffDays = Math.round(Math.abs((pastDate.getTime() - new Date().getTime())/(oneDay)));
		
		return diffDays;
	},
	
	//update and array with how many visits in the last year, array must be equal to period
	updateVisitsInLastTimePeriod: function(yearAr, o, period){
		$.each(o.visits, function(i,v){
			 var date = new Date(v.startTime);
			 var daysAgo = util.daysAgo(date);
			 
			 if (daysAgo < period){
				yearAr[period -1 -daysAgo]++;
			 }
		});
	},
	
	//parse special chars and return array of tokens
	parseSearch: function(search){
		return search.replace(/\D\W/g,' ').replace(/^ /,'').replace(/ $/,'').split(' ');
	},
	
	//update and array with how many visits in the last year, array must be 365 in size
	updateDomainVisitsInLastYear: function(yearAr, o){
		var date = new Date(o.visits.startDate);
		var daysAgo = util.daysAgo(date);
		
		if (daysAgo < 182){
			yearAr[181-daysAgo]+=o.visits.page_visits;
		}
	},
	
	//add days to a date object
	addDays: function(myDate,days) {
		return new Date(myDate.getTime() + days*24*60*60*1000);
	},
	
	//output a number of days from a start date
	printDays: function(startDate, days,increment){
		var str = '';
		for (var i=0; i<days*increment;i+=increment){
			var duration=Math.floor(Math.random()*250)+100
			var a = util.addDays(startDate,i);
			var b = a.toISOString().replace(/-/gi,'/').replace(/T/,' ')
			str += '{date: "'+b.substring(0,b.length-5)+'",duration: '+duration+'},\n';
		}
		
		return str;
	},
	
	//return the search field in the page or return null
	findSearchField: function(){
		//TODO make function to find searchfields
		var search_fields = $('[name=q]');

		//add in special for bing demo
		if (search_fields.length == 0){
			search_fields = $('#sb_form_q');
		}

		if (search_fields.length > 0){
			var search_field = $(search_fields[0]);
			
			return search_field;
		}
		else{
			return null;
		}
	},
	shuffleArray: function(array) {
		var tmp, current, top = array.length;

		if(top) while(--top) {
			current = Math.floor(Math.random() * (top + 1));
			tmp = array[current];
			array[current] = array[top];
			array[top] = tmp;
		}

		return array;
	},
	//trim the link text to manageable length
	trimLinkText: function(str){
		var return_str = '';
		
		if (str){		
			if (str.length > 43){
				return_str = str.substring(0,40)+'...';
			}
			else{
				return_str = str;
			}	
		}
		
		return return_str;
		
	},
	
	getPortrait: function(name){
		var img = null;
		var people = [
			{
				name: 'Mary',
				img: '/images/mary.jpg'
			},
			{
				name: 'John',
				img: '/images/john.jpg'
			},
			{
				name: 'Lynn',
				img: '/images/lynn.jpg'
			}
		];
		
		if (typeof people != 'undefined'){
			$.each(people, function(i,person){
				if (person.name===name){
					img = person.img;
				}
			});
			if (img){
				return chrome.extension.getURL(img);
			}
			else{
				portrait = chrome.extension.getURL("/images/you.jpg");
				
				$.ajax({
					url: WebWearImageServer+name+'.jpg',
					type:'HEAD',
					async: false,
					error: function()
					{
						portrait = chrome.extension.getURL("/images/you.jpg");
					},
					success: function()
					{
						//file exists
						portrait = WebWearImageServer+name+'.jpg';
					}
				});
			
				return portrait;
			}
			
		}
		else return chrome.extension.getURL("/images/you.jpg");
	}
};


