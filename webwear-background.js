//init variables for the whole extension
	currentWindowId = -1;	//keep track of the active tab
	currentTabId = -1;

	//set up variables
	
	localStorage['socialnavOn'] = false;
		
	if (!('username' in localStorage)){
		//open set username page
		chrome.tabs.create({'url': chrome.extension.getURL('create_username.html'), 'selected': true});
	}
	
	if (!('visibilityOn' in localStorage)){
		localStorage['visibilityOn'] = "false";
	}	

	if (!('filterUsers' in localStorage)){
		localStorage['filterUsers'] = "[]";
	}
	//leave wear
	if (!('trackingOn' in localStorage)){
		localStorage['trackingOn'] = "false";
	}
	//don't log system use
	if (!('loggingOn' in localStorage)){
		localStorage['loggingOn'] = "false";
	}
	if (!('collectionPrefix' in localStorage)){
		localStorage['collectionPrefix'] = "test1";
	}
	
	chrome.extension.onRequest.addListener(
	    function(request, sender, sendResponse) {
			if (WebWearDebug) console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
			if (WebWearDebug) console.log(request.data);
			
			if (request.type == "initVariables"){
				sendResponse(
					{
						"user": localStorage['username'], 
						"filterUsers": JSON.parse(localStorage['filterUsers']),
						"visibilityOn": JSON.parse(localStorage['visibilityOn']),
						"trackingOn": JSON.parse(localStorage['trackingOn']),
						"socialnavOn": JSON.parse(localStorage['socialnavOn']),
						"collectionPrefix": localStorage['collectionPrefix']
					}
				);
			}
			
			else if (request.type == 'logVisit'){
				request.data.startDate = {$date: new Date(request.data.startTime).getTime()};
				request.data.endDate = {$date: new Date(request.data.startTime).getTime()};
				
				var postUrl = WebWearData+"logs/_insert";
				var safe = "safe=1";
				var docs = "docs=["+encodeURIComponent(JSON.stringify(request.data))+"]";
								
				if (JSON.parse(localStorage['loggingOn'])){		
					$.post( postUrl, docs+'&'+safe, function(data, textStatus, jqXHR){if (WebWearDebug) console.log(data);} , 'json' );
				}
			}
			
			else if (request.type == "storeVisit"){
			
				request.data.startDate = {$date: new Date(request.data.startTime).getTime()};
				request.data.endDate = {$date: new Date(request.data.startTime).getTime()};
				
				var postUrl = WebWearData+"/_insert";
				var safe = "safe=1";
				var docs = "docs=["+encodeURIComponent(JSON.stringify(request.data))+"]";
				
				
				
				if (JSON.parse(localStorage['trackingOn'])){		
					$.post( postUrl, docs+'&'+safe, function(data, textStatus, jqXHR){if (WebWearDebug) console.log(data);} , 'json' );
								
					//if there is a search save it separately
					if (request.data.search.length > 0){
						var searchPostUrl = WebWearData+"search/_insert";
						
						var searchDoc = {
											"search": request.data.search.replace(/\+/g,' '),
											"user": request.data.user,
											"cleanUrl": request.data.cleanUrl,
											"startTime": request.data.startTime,
											"endTime": request.data.endTime,
											"length": request.data.length,
											"startDate": request.data.startDate,
											"endDate": request.data.endDate
						}
						var searchDocs = "docs=["+encodeURIComponent(JSON.stringify(searchDoc))+"]";
						
						$.post( searchPostUrl, searchDocs+'&'+safe, function(data, textStatus, jqXHR){if (WebWearDebug) console.log(data);} , 'json' );
					}
				}
			}
			else{
				if (WebWearDebug) console.log('unknown background log request');
			}
	    }
	);
	
	chrome.tabs.onActivated.addListener(function(activeInfo) {
		if (WebWearDebug) console.log('tab activated: tab:'+activeInfo.tabId +' win:'+activeInfo.windowId);
		if (currentTabId != activeInfo.tabId){
			//send message to previous content script
			
			if (currentTabId != -1){
				chrome.tabs.sendRequest(currentTabId, {'endVisit': true});
			}
		}
		
		currentWindowId = activeInfo.windowId; 
		currentTabId = activeInfo.tabId;
		
		chrome.tabs.sendRequest(currentTabId, {'startVisit': true});
	
	});