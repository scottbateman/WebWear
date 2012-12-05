$(document).ready(function() {
	local_plugins();
    
	var doc = $(document);

	if (!$.webWear) {
		$.webWear = {};
		$.webWear.vals = [];
		$.webWear.initCompleted = false;
		$.webWear.loadWearLock = false;
		$.webWear.allPageLinks = $([]);
		$.webWear.lastSearch = '';
		var url = $(location).attr('href');
		$.webWear.currentPage = util.parseCleanUrl(url);
		$.webWear.currentDomain = util.parseDomain(url);
		$.webWear.vals[$.webWear.currentPage] = {"domains":[],"searchers":[],"pages":[],"pageRanks":[]};
	}
			
		
	//init variables
	chrome.extension.sendRequest({type:"initVariables"},
		function(response){
			$.webWear.user = response.user;
			$.webWear.filterUsers = response.filterUsers;
			$.webWear.visibilityOn = response.visibilityOn;
			$.webWear.socialnavOn = response.socialnavOn;
			$.webWear.collectionPrefix = response.collectionPrefix;
			main();
		}
	);	
});

function main() {	
	$(window).bind('beforeunload',function(e){
		$.webWear.visit.endVisit();	
		$.webWear.logVisit.endVisit();
		if (WebWearDebug) console.log('ending visit beforeunload for: '+$.webWear.visit.rawUrl);
	});
	$(window).hashchange( function(){
		$.webWear.visit.endVisit();	
		$.webWear.logVisit.endVisit();
		if (WebWearDebug) console.log('ending visit onhashchange for: '+$.webWear.visit.rawUrl);
		
		var rawUrl = $(location).attr('href');
		$.webWear.visit = new Visit($.webWear.user, rawUrl, $('title').text());
		$.webWear.logVisit = new LogVisit($.webWear.user, rawUrl, $('title').text());
	});
	
	
	if ($.webWear.socialnavOn || $.webWear.visibilityOn){
		//createPageScreen();
	}
	
	chrome.extension.onRequest.addListener(
		function(request, sender, sendResponse) {
			if (request.endVisit){
				$.webWear.logVisit.endVisit();
				$.webWear.visit.endVisit();
				if (WebWearDebug) console.log('ending visit for: '+$.webWear.visit.rawUrl);
			}
			else if (request.startVisit){
				var rawUrl = $(location).attr('href');
				$.webWear.visit = new Visit($.webWear.user, rawUrl, $('title').text());
				$.webWear.logVisit = new LogVisit($.webWear.user, rawUrl, $('title').text());
				if (WebWearDebug) console.log('starting visit for: '+$.webWear.visit.rawUrl);
			}
		}
	);
	
	var rawUrl = $(location).attr('href');
	$.webWear.visit = new Visit($.webWear.user, rawUrl, $('title').text());
	$.webWear.logVisit = new LogVisit($.webWear.user, rawUrl, $('title').text());
		
		
	$(window).bind('getData',function(){
		
		if (WebWearDebug) console.log('received: '+$.webWear.getDataCounter);
		if ($.webWear.getDataCounter===0 && ($.webWear.visibilityOn || $.webWear.socialnavOn)){
			$.webWear.busy = true;
			
			if ($.webWear.visibilityOn){
				displayLinkWear();
			}
			else if ($.webWear.socialnavOn){
				displayLinkRank();
			}
			
			if ($.webWear.visibilityOn && !('a' in $.webWear)){
				displayWebWear();
			}
			else if ($.webWear.socialnavOn && !('a' in $.webWear)){
				displayPageRank();
			}
			
			
			if ($.webWear.visibilityOn && !('s' in $.webWear)){
				displaySearchWear();
			}
			
									
			$('body').keypress(
				function(e){
					if (e.ctrlKey && e.charCode === 9){
						e.preventDefault();
						
						$.webWear.a.toggle();
						$.webWear.o.toggle();
						//$.webWear.s.toggle();
					}
					else if (e.ctrlKey && e.charCode === 25){
						e.preventDefault();
						
						$.webWear.a.remove();
						$.webWear.o.remove();
						$.webWear.s.remove();
						$('.webwear-link-annotation').remove();
						$('.webwear-domain-annotation').remove();
					}
				}
			);
			
			$.webWear.loadWearLock = false;
			$('#webwear-page-screen').remove();
			
			
			if (!$.webWear.initCompleted){
				var rawUrl = $(location).attr('href');
				setInterval('getWebWear()',1000);
			}
						
			$.webWear.initCompleted = true;
		}
	});
	
	getWebWear();
}



function getNewLinks(){
	createWebWearOverlay();		//create the sidebar overlay if needed

	//get only visible links with size
	var links = util.getPageLinks();		
	
	var goneLinks = $($.webWear.allPageLinks).diff($(links));
	
	if (goneLinks.length>0){
		cleanUpLinkAnnotations(goneLinks);
	}
	
	var newLinks = $(links).diff($.webWear.allPageLinks);
	$.merge($.webWear.allPageLinks,newLinks);
	
	return newLinks;
}

function cleanUpLinkAnnotations(goneLinks){
	$.each(goneLinks, function(i,link){
		$('.webwear-domain-annotation').filter(function(i,a){return ($(a).data('link')===link)}).remove();
		$('.webwear-link-annotation').filter(function(i,a){return ($(a).data('link')===link)}).remove();
		$.webWear.allPageLinks = $.webWear.allPageLinks.removeFromArray(link);
		//delete $.webWear.vals[$.webWear.currentPage].pages[util.parseCleanUrl(link.href)];
		//delete $.webWear.vals[$.webWear.currentPage].domains[util.parseDomain(link.href)];
	});
}

function getWebWear(){
	if (!$.webWear.loadWearLock){
		
		$.webWear.loadWearLock = true;
		var newLinks = getNewLinks();
		
		if ($.webWear.visibilityOn){
			loadWebWear(newLinks);
		}
		else if ($.webWear.socialnavOn){
			loadPageRank(newLinks);
		}
		
		//$(window).trigger('getData');
	}
	else{
		if (WebWearDebug) console.log('busy can\'t get webwear');
	}
}

function loadPageRank(links) {
	var getUrl = WebWearData+'/_pagerank';
	$.webWear.getDataCounter = 0;
	$.webWear.getPageCounter = 0;
	
		
	var handlePageRankData = function(data){
		if (data && 'ok' in data  && data.ok == 1){
			var dataBank = $.webWear.vals[$.webWear.currentPage];
			//var cleanUrl = util.parseCleanUrl(data.url);
			var cleanUrl = util.parseCleanUrl(data.origUrl);
			
			if ($.webWear.currentPage == cleanUrl){
				dataBank.pageRanks[$.webWear.currentPage] = data;
			}
			
			else if (!(cleanUrl in dataBank.pageRanks)){
				dataBank.pageRanks[cleanUrl] = data;
			}
			
			else if (dataBank.pageRanks[cleanUrl].rank < data.rank){
				dataBank.pageRanks[cleanUrl] = data;
			}					
		}
	
		if (WebWearDebug) console.log('handled page data');
	
	};
	
	var dataBank = {'pageRanks': []};
	
	//get the visitation for the current page
	if (typeof $.webWear.currentPage != 'undefined' && !($.webWear.currentPage in $.webWear.vals[$.webWear.currentPage].pageRanks)){
			
		dataBank.pageRanks[$.webWear.currentPage] = [];
		$.webWear.vals[$.webWear.currentPage].pageRanks[$.webWear.currentPage] = [];
		
		var data = {"criteria": JSON.stringify({"url": util.parseWithoutQueryString($(location).attr('href')), "origUrl":$(location).attr('href')})};
	
		$.ajax(
			{
				data: data,
				type: 'GET',
				url: getUrl, 
				success: handlePageRankData, 
				async:true,
				
			}
		).done(function (x, text){
							$.webWear.getDataCounter--;
							$(window).trigger('getData');
	
							if (WebWearDebug) console.log('page complete '+ $.webWear.getDataCounter+' '+x.responseText+' '+text);
						});
		
		$.webWear.getDataCounter++;
		if (WebWearDebug) console.log('request page'+$.webWear.getDataCounter+': '+$.webWear.currentPage+' '+getUrl);
	}
	
	$.each(links, function(i,link){
		var data = {"criteria": JSON.stringify({"url": util.parseWithoutQueryString(link.href), "origUrl": link.href})};
			
		$.ajax(
				{
					data: data,
					type: 'GET',
					url: getUrl, 
					success: handlePageRankData, 
					async:true, 
					complete: function (x, text){
							$.webWear.getDataCounter--;
							$(window).trigger('getData');
	
							if (WebWearDebug) console.log('page complete '+ $.webWear.getDataCounter+' '+x.responseText+' '+text);
						}
				}
			);
			
		$.webWear.getDataCounter++;
	});
	
	//if there are no data being added than quit
	if ($.webWear.getDataCounter === 0){
		$.webWear.loadWearLock=false;
	}
}

function loadWebWear(links) {
	var getUrl = WebWearData+'/_find?batch_size=1000&sort={"startDate":-1}';
		
	$.webWear.getDataCounter = 0;
	$.webWear.getPageCounter = 0;
	$.webWear.getDomainCounter = 0;
	
	var handlePageData = function(data){
			if ('results' in data ){
							
				$.each(data.results,function(j,result){
					var dataBank = $.webWear.vals[$.webWear.currentPage];
										
					if (!(result.cleanUrl in dataBank.pages)){
						dataBank.pages[result.cleanUrl] = {'visitors':[]};
					}
					
					if (!(result.user in dataBank.pages[result.cleanUrl].visitors)){
						dataBank.pages[result.cleanUrl].visitors[result.user] = [];
					}
					
					dataBank.pages[result.cleanUrl].visitors[result.user].push(result);
					
				});
			}
		
			if (WebWearDebug) console.log('handled page data');
		
			$.webWear.getDataCounter--;
			$(window).trigger('getData');
		
		};
	
	var handleDomainData = function(data){
		if ('results' in data ){
			$.each(data.results,function(j,result){
				var dataBank = $.webWear.vals[$.webWear.currentPage];
									
				if (!(result.domain in dataBank.domains)){
					dataBank.domains[result.domain] = {'visitors':[]};
				}
				
				if (!(result.user in dataBank.domains[result.domain].visitors)){
					dataBank.domains[result.domain].visitors[result.user] = [];
				}
				
				dataBank.domains[result.domain].visitors[result.user].push(result);
				
			});
		}
		$.webWear.getDataCounter--;
		
		if (WebWearDebug) console.log('handled domain data');
		
		$(window).trigger('getData');
		
	};
	
		
	var dataBank = {'domains': [],'pages':[]};
	
	var userExcludeObj = {$nin:$.webWear.filterUsers,$exists:true};
	
	//get the visitation for the current page
	if (typeof $.webWear.currentPage != 'undefined' && !($.webWear.currentPage in $.webWear.vals[$.webWear.currentPage].pages)){
			
		dataBank.pages[$.webWear.currentPage] = [];
		$.webWear.vals[$.webWear.currentPage].pages[$.webWear.currentPage] = {'visitors':[]};
		var requestUrl = getUrl+'{"cleanUrl":"'+encodeURIComponent($.webWear.currentPage)+'"}';
		var data = {"criteria": JSON.stringify({"cleanUrl": $.webWear.currentPage, "user": userExcludeObj})};
	
		$.ajax(
			{
				data: data,
				type: 'GET',
				url: getUrl, 
				success: handlePageData, 
				async:true, 
				complete: function (x, text){
						if (WebWearDebug) console.log('page complete '+ $.webWear.getDataCounter+' '+x.responseText+' '+text);
					}
			}
		);
		
		$.webWear.getDataCounter++;
		if (WebWearDebug) console.log('request page'+$.webWear.getDataCounter+': '+$.webWear.currentPage+' '+requestUrl);
	}
		
	//get the visitation for the current domain
	if (typeof $.webWear.currentDomain != 'undefined' && !($.webWear.currentDomain in $.webWear.vals[$.webWear.currentPage].domains)){
		dataBank.domains[$.webWear.currentDomain] = [];
		$.webWear.vals[$.webWear.currentPage].domains[$.webWear.currentDomain] = {'visitors':[]};
		
		var requestUrl = getUrl+'{"domain":"'+encodeURIComponent($.webWear.currentDomain)+'"}';
		var data = {"criteria": JSON.stringify({"domain": $.webWear.currentDomain, "user": userExcludeObj})};
		
		$.ajax(
			{
				url: getUrl, 
				data: data,
				type: "GET",
				success: handleDomainData, 
				async:true, 
				complete: function (x, text){
					if (WebWearDebug) console.log('domain complete '+ $.webWear.getDataCounter+' '+' '+x.responseText+	' '+text);
				}
			}
		);
		
		$.webWear.getDataCounter++;
		if (WebWearDebug) console.log('request domain'+$.webWear.getDataCounter+': '+$.webWear.currentDomain);
	}
	
	
	//get the visitation for all links in the page
	$.each(links, function(i,link){
		var href = util.parseCleanUrl(link.href);
		
		if (href != null){
			
			if ((!(href in dataBank.pages)) && (!(href in $.webWear.vals[$.webWear.currentPage].pages)) && typeof href != 'undefined'){
				
				dataBank.pages[href] = [];
				$.webWear.vals[$.webWear.currentPage].pages[href] = {'visitors':[]};
			
				//get the visitation for the current page
				var requestUrl = getUrl+'{"cleanUrl":"'+encodeURI(href)+'"}';
				var data = {"criteria": JSON.stringify({"cleanUrl": href, "user": userExcludeObj})};
				
				$.ajax({	
					url: getUrl,
					type: 'GET',
					data: data,
					success: handlePageData, 
					async:true
					, complete: 
						function (x, text){
							if (WebWearDebug) console.log('complete '+ $.webWear.getDataCounter+' '+x+' '+text);
						}
					}
				);
				
				$.webWear.getDataCounter++;
			
				if (WebWearDebug) console.log('request page'+$.webWear.getDataCounter+': '+href+' '+requestUrl+' ' +data);
			}
			
			var domain = util.parseDomain(link.href);
		
			if ((!(domain in dataBank.domains)) && (!(domain in $.webWear.vals[$.webWear.currentPage].domains)) && typeof domain != 'undefined'){
				
				dataBank.domains[domain] = [];
				$.webWear.vals[$.webWear.currentPage].domains[domain] = {'visitors':[]};
				
				var data = {"criteria": JSON.stringify({'domain':domain, "user": userExcludeObj})};
				
				$.ajax({
					url: getUrl,
					type: 'GET',
					data: data,
					success: handleDomainData, 
					async:true
				});
				
				$.webWear.getDataCounter++;
				
				if (WebWearDebug) console.log('request domain'+$.webWear.getDataCounter+': '+domain);
			}
		}
	});
	
	//if there are no data being added than quit
	if ($.webWear.getDataCounter === 0){
		$.webWear.loadWearLock=false;
	}
}

function displayPageRank(){
	if (WebWearDebug) console.log("displaying page rank for page: " + $.webWear.currentPage);
	
    //create and add page activity indicator 
    $.webWear.a = $('<div id="webwear-activity-container"></div>');
    $.webWear.a.css({
            'height': 6+'px',
            'width': '176px',
            'position': 'absolute',
            'left': '50%',
			'margin-left': -90,
            'top': '0',
            'opacity': '1',
            'color': 'white',
			'background-color': 'white',
            'border': '1px solid black',
			'font-size': '10pt',
            //'padding': '8px',
            'z-index': '1000002',
			'text-align': 'center',
			'display': 'table',
			'padding': '5px 10px 0 10px',
			'vertical-align': 'top'
        });
		
	var pageRankActivity = $('<div id="webwear-pagerank-activity"></div>');	
		
	pageRankActivity.css(
		{
			'background-color' : 'white',
			'width' : '100%',
			'height' : '10px',
			'position' : 'absolute',
			'top': '0',
			'left': '0',
			'border': '1px solid brickred'
		}
	);
	
	pageRankActivity = fillAnnotation('pagerank',pageRankActivity,$.webWear.wearCurrentPageRank[0]);
	
	$.webWear.a.append(pageRankActivity);
	
	$('body').append($.webWear.a);
}

function displayWebWear() {
	if (WebWearDebug) console.log("displaying webWear for page: " + $.webWear.currentPage);
	
    //create and add page activity indicator 
    $.webWear.a = $('<div id="webwear-activity-container"></div>');
    $.webWear.a.css({
            'height': 6+'px',
            'width': '354px',
            'position': 'absolute',
            'left': '50%',
			'margin-left': -175,
            'top': '0',
            'opacity': '1',
            'color': 'white',
			'background-color': 'white',
            'border': '0px solid black',
			'font-size': '10pt',
            //'padding': '8px',
            'z-index': '1000002',
			'text-align': 'center',
			'display': 'table',
			//'padding': '5px 10px 0 10px',
			
			'vertical-align': 'top'
        });
		
	var pageActivity = $('<div id="webwear-page-activity"></div>');	
	var domainActivity = $('<div id="webwear-domain-activity"></div>');	
	
	pageActivity.css(
		{
			'background-color' : 'white',
			'width' : 175,
			'height' : '10px',
			'position' : 'relative',
			'top': '0',
			'left': '0',
			'float': 'left',
			'border': '1px solid darkmagenta'	
		}
	);
		
	domainActivity.css(
		{
			'background-color' : 'white',
			'width' : 175,
			'height' : '10px',
			'position' : 'relative',
			'top': '0',
			'right' : '0',
			'float': 'right',
			'border': '1px solid forestgreen'
		}
	);
	
	pageActivity = fillAnnotation('link',pageActivity,$.webWear.wearCurrentPage[0]);
	domainActivity = fillAnnotation('domain',domainActivity,$.webWear.wearCurrentDomain[0]);
	
	$.webWear.a.append(pageActivity);
	$.webWear.a.append(domainActivity);

	
	pageActivity.mouseenter(function(e){
		activityEnterHandler(e,true);
		$.webWear.logVisit.startAction('this-page-activity');
	});
	
	domainActivity.mouseenter(function(e){
		activityEnterHandler(e,false);
		$.webWear.logVisit.startAction('this-domain-activity');
	});
	
    $.webWear.a.mouseleave(
        function(e){
            $.webWear.a.animate({'height': '6px','opacity': '1', 'margin-left': '-175'}, 'fast');
			//$.webWear.a.children().animate({'width': '174px'},'fast');
			$.webWear.a.css({'text-align':'center', 'border': '0px solid black'});
            $.webWear.a.children('.webwear-page-annotation-details').remove();
			$($.webWear.a.children('#webwear-page-activity')).css({'opacity':'1'});
			$($.webWear.a.children('#webwear-domain-activity')).css({'opacity':'1'});
			$('.webwear-sparkline-container').remove();
			$.webWear.logVisit.endAction();
		}
    );
	
    $('body').append($.webWear.a);
}

function activityEnterHandler(e, isPageActivity){
	$.webWear.a.animate({"height": '200px', "width":'354px', 'margin-left': '-175', "backgroundColor": 'white',"opacity": '1', "color": 'black'},'fast');
	//$.webWear.a.children().animate({'width': '173px'},'fast');
	$.webWear.a.css('text-align','left');
	
	$.webWear.a.children('.webwear-page-annotation-details').remove();
		
	var ref_text = '';
	
	ref_text = '<br class="webwear-page-annotation-details"/><div class="webwear-page-annotation-details">';
	
	//init visits for the last year -- actually a month
	var yearActivity = new Array(30);
	for (var i=0; i<yearActivity.length; i++) yearActivity[i] = 0;
	
	if (isPageActivity){
		ref_text += '<div class="webwear-popup-title"><div style="position: absolute; bottom: 0px;">activity on this page</div></div>';
		$.webWear.a.css({'border':'1px solid darkmagenta'});
		$($.webWear.a.children('#webwear-domain-activity')).css({'opacity':'.5'});
		$($.webWear.a.children('#webwear-page-activity')).css({'opacity':'1'});
			
		//build html for pop-ups for this page 
		$.each($.webWear.wearCurrentPage, function(i,o){	
			
			//restructure data
			var v = [];
			for (i in o.visitors){v.push({'user':i,'visits':o.visitors[i]})};
			
			//order by the person who has had the latest visit
			var visitors = Enumerable.From(v).OrderByDescending(
				function(x){
					var max = Enumerable.From(x.visits).Max(
						function(y){return new Date(y.startTime);}
					);
					
					return max;
				})
				.OrderByDescending(
					function(x){ return new Date(x.visits[0].startTime);}
				)
				.ToArray();
		
			$.each(visitors, function(j,p){
				ref_text += create_link_annotation_text(p,'page',0,25);
				util.updateVisitsInLastTimePeriod(yearActivity,p,30);
			});
			ref_text += '</div>';
		});
		ref_text = fix_ref_text(ref_text,25); 
	
	}
	else{
		ref_text += '<div class="webwear-popup-title"><div style="position: absolute; bottom: 0px;"><br /><br />activity on '+$.webWear.currentDomain+'</div></div>';
		$.webWear.a.css({'border':'1px solid forestgreen'});
		$($.webWear.a.children('#webwear-domain-activity')).css({'opacity':'1'});
		$.webWear.a.children('#webwear-page-activity').css({'opacity':'.5'});
		
					
		//build html for pop-ups for this page 
		$.each($.webWear.wearCurrentDomain, function(j,o){
		
			//restructure data
			var v = [];
			for (i in o.visitors){v.push({'user':i,'visits':o.visitors[i]})};

			
			//order by the person who has had the latest visit
			var visitors = Enumerable.From(v).OrderByDescending(
				function(x){
					var max = Enumerable.From(x.visits).Max(
						function(y){return new Date(y.startTime);}
					);
					
					return max;
				})
				.OrderByDescending(
					function(x){ return new Date(x.visits[0].startTime);}
				)
				.ToArray();
				
			
			$.each(visitors, function(j,p){
				ref_text += create_link_annotation_text(p,'domain',0,10);//domain
				util.updateVisitsInLastTimePeriod(yearActivity,p,30);
			});
		});
		
		ref_text += '</div>';
		
		ref_text = fix_ref_text(ref_text,10); 
		
	}
			
			
	//$.webWear.a.empty();
	
	$.webWear.a.append(ref_text);
	
	$.webWear.a.find('.webwear-dialog-expand-link').click(function(e){
		$.webWear.logVisit.addShortAction('expand-dialog-details-2');
		handleExpandActivityDetails(e);
	});
	
	$('.webwear-sparkline-container').remove();
	
	//if (isPageActivity){
		$.webWear.a.find('.webwear-popup-title').append('<div class="webwear-sparkline-container">1m<span class="webwear-sparkline">Loading..</span>now</div>');
	//}
	
	var sparkLine = $($('.webwear-sparkline')[0]);
	sparkLine.sparkline(yearActivity, {width: '100px', height: '25px', minSpotColor: '', maxSpotColor: '', fillColor: false});
	
	$.sparkline_display_visible();

}    

function fix_ref_text(ref_text,limit){
	ref_text = $(ref_text);
	
	ref_text.find(':regex(class, webwear-user-activity-detail-group)').hide();
	ref_text.find('.webwear-user-activity-detail-group0').show();	//make group0 visible
	ref_text.find(".webwear-user-activity-detail-container").data('group',0);
	ref_text.find('.webwear-link-details-nav-prev').hide();
	//webwear-history-domain-visit
	
	$.each(ref_text.find(".webwear-user-activity-detail-container"), function(i, container){
		if ($(container).children().length -2 <= limit){
			$(container).find('.webwear-link-details-nav-next').hide();
		}	
	});
	
	
	ref_text.find('.webwear-link-details-nav-prev').unbind();
	ref_text.find('.webwear-link-details-nav-prev').click(
		function(e){
			$.webWear.logVisit.addShortAction('expand-dialog-nav-prev');
			e.preventDefault();
			handleDetailsNavClick(-1, e, limit);
		}
	);
	
	ref_text.find('.webwear-link-details-nav-next').unbind();
	ref_text.find('.webwear-link-details-nav-next').click(
		function(e){					
			$.webWear.logVisit.addShortAction('expand-dialog-nav-next');
			e.preventDefault();
			handleDetailsNavClick(1, e, limit);
		}
	);
	
	ref_text.find('.webwear-show-domain-visits-details').unbind();
	ref_text.find('.webwear-show-domain-visits-details').click(
		function(e){
			$.webWear.logVisit.addShortAction('expand-dialog-domain');
			e.preventDefault();
			
			if ($(this).text()==='+'){
				$(this).text('-');
				$(this).parent().find('.webwear-history-domain-visit').show();
			}
			else{
				$(this).text('+');
				$(this).parent().find('.webwear-history-domain-visit').hide();
			}
		}
	);
	
	
	ref_text.css({
		'padding': '0 8px 5px 8px'
	});
	
	
	return  ref_text;
}

function handleDetailsNavClick(step,e,limit){
	var activities = $(e.target).parent().parent();
	var group = activities.data('group');
	
	//if positive step
	if (step > 0){ 
		//if there are children left to 
		if (activities.children().length-2 >= limit*group){
			activities.find(':regex(class, webwear-user-activity-detail-group)').hide();
			activities.find('.webwear-user-activity-detail-group'+(group+1)).show();	//make group0 visible
			activities.data('group',group+1);
		}
		//show next link?
		if (activities.children().length-2 > limit*(group)+(limit*2)){
			activities.find('.webwear-link-details-nav-next').show();
		}
		else{
			activities.find('.webwear-link-details-nav-next').hide();
		}
		
		activities.find('.webwear-link-details-nav-prev').show();
	}

	//if positive step
	else if (step < 0){
		//if there are children left to 
		if (group > 0){
			activities.find(':regex(class, webwear-user-activity-detail-group)').hide();
			activities.find('.webwear-user-activity-detail-group'+(group-1)).show();	//make group0 visible
			activities.data('group',group-1);
		}

		//show prev link?
		if (step+group > 0){
			activities.find('.webwear-link-details-nav-prev').show();
		}
		else{
			activities.find('.webwear-link-details-nav-prev').hide();
		}
		activities.find('.webwear-link-details-nav-next').show();
	}	
}

function handleExpandActivityDetails(e){
	e.preventDefault();
	setTimeout(function(){$('#webwear-dialog').parent().css('z-index','1000003');},1);	//put dialog back on top
	var details = $(e.target).parents('.webwear-user-activity-container').children('.webwear-user-activity-detail-container');
	
	if (details.is(":visible")){
		$(e.target).html('+');
	}
	else{
		$(e.target).html('-');
	}
	
	details.toggle();
	
	return false;
}


function displaySearchWear(e) {
	var search_field = util.findSearchField();
	
	if (search_field) {
		
		//add auto-complete wear
		var fieldPos = search_field.offset();
		var width = $(search_field).width();
		var searchInd = $('<div class="searchInd"></div>');
		searchInd.css({
			"position":"absolute",
			"top": fieldPos.top + search_field.height()+5,
			"left": fieldPos.left,
			"height": "200px",
			"min-width": search_field.width(),
			"border": "thin solid black",
			"padding": "5px",
			"background-color": "white",
			"color": "black",
			"z-index": "1000000"
		});
		
		
		$.webWear.s = searchInd;
		$('body').append($.webWear.s);
		$.webWear.s.hide();

		//add key press event
		search_field.focusin(handleSearchEvent);
		search_field.keyup(handleSearchEvent);
		
		search_field.keydown(handleSearchNav);
		
		$('body').click(
			function(e){
				if (e.target.name=='q'){
					//do nothing?
				}
				else{
					$.webWear.s.hide();
					$.webWear.logVisit.endAction();
				}
			}
		);
	}
}

function handleSearchNav(e) {
	var search_field = util.findSearchField();
			
	//hit enter
	if (e.which == 13){
		e.preventDefault();
		var highlighted = $.webWear.s.children('.webwear-querycompletion-selected');

		if (highlighted.length > 0){
			var query = $($(highlighted[0]).children('.webwear-search')[0]).text();
			search_field.val(query);
		}
		$.webWear.s.hide();
	}
	
	//stop up and down arrows
	else if (e.which==38 || e.which==40){
		e.preventDefault();
		
		var query_lines = $.webWear.s.children('.webwear-querycompletion');
		var highlighted = $.webWear.s.children('.webwear-querycompletion-selected');
		
		var selectedIdx = $.inArray(highlighted[0], query_lines);

		//if up
		if (e.which == 38){
			if (selectedIdx == -1);//do nothing
			
			else {
				$(query_lines[selectedIdx]).removeClass('webwear-querycompletion-selected');
				
				if (selectedIdx > 0) {
					$(query_lines[selectedIdx-1]).addClass('webwear-querycompletion-selected');
					
					search_field.val($(query_lines[selectedIdx-1]).find('.webwear-search').text());
				}
			}
			
		}
		
		//if down
		else {
			if (selectedIdx == query_lines.length-1);//do nothing if at end of list
			
			else {
			
				if (selectedIdx != -1) {
					$(query_lines[selectedIdx]).removeClass('webwear-querycompletion-selected');
				}
				$(query_lines[selectedIdx+1]).addClass('webwear-querycompletion-selected');
				search_field.val($(query_lines[selectedIdx+1]).find('.webwear-search').text());
			}
		}
		
	}
}

function handleSearchEvent(e) {
	var search = $(this).val();
	var userExcludeObj = {$nin:$.webWear.filterUsers,$exists:true};
	
	
	var search_field = util.findSearchField();
	var fieldPos = search_field.offset();
	
	$.webWear.s.css({
			"top": fieldPos.top + search_field.height()+5,
			"left": fieldPos.left,
			"min-width": search_field.width()
	});
	
	//not up or downd arrows
	if (e.which != 38 && e.which != 40 && (search != $.webWear.lastSearch || search == '')) {

		$.webWear.s.show();
		
		//var wearSearchers = $.webWear.vals[$.webWear.currentPage].searchers;
		
		/*Enumerable.From($.webWear.vals[$.webWear.currentPage].pages)
									.Where("$.href =='" +$.webWear.currentPage+"'")
									.ToArray()[0];*/

		var search = $(this).val(); 
		
		var searches = util.parseSearch(search);
		
		var searchArray = [];
		
		searches.forEach(
			function(word){
				if (word != ''){
					searchArray.push({search:{$regex:word, $options: "i"}});
				}
			}
		);
	  		
		var searchUrl = WebWearData+'search/_find?batch_size=200&sort={"startDate":-1}';
		
		if (search != '') {
			
			$.ajax({
				data: 	
					{"criteria": JSON.stringify(
							{
								"$and": searchArray,
								
								"user": userExcludeObj
								
							}
						)
					},
				type: 'GET',
				url: searchUrl, 
				success: populateSearchWear, 
				async:true
					
			});
		
		}
		else {
		
			$.ajax({
				data: 	
					{"criteria": JSON.stringify(
							{"search": 
								{
									"$regex": search,
									"$options": "i"
								},
								
								"user": userExcludeObj
							}
						)
					},
				type: 'GET',
				url: searchUrl, 
				success: populateSearchWear,
				async:true
					
			});

		}

		$.webWear.s.empty();
		$.webWear.lastSearch = search;
		
		//searches = Enumerable.From(searches).OrderByDescending(function(x){return new Date(x.date);}).Take(12).ToArray();
	}
	else if (e.keyCode == 27){
		$.webWear.s.hide();
	}
}

function populateSearchWear(searches, text){		
		$.webWear.s.empty();
		
		var searchLines = [];
		
		$.each(searches.results, function(i, s){
			var key = s.user+'--'+decodeURIComponent(s.search);
			if (!(key in searchLines)){
				searchLines[key] = s;
				searchLines[key].count = 1;
				searchLines[key].list = [];
				searchLines[key].list.push(s);
			}
			else{
				searchLines[key].count++ ;
				searchLines[key].list.push(s);
			}
		});
		
		for (key in searchLines){
			var s = searchLines[key];
			
			//get time - format into ISO 8601 timestamp
			var date = new Date(s.startTime);
			var date_html = '<abbr class="timeago" title="'+date.toString()+'">'+$.timeago(date)+'</abbr>';
			date_html +='</li>';

			var line_text = "<div class='webwear-querycompletion'><span class='webwear-search'>"+
				decodeURIComponent(s.search).replace(/\+/g,' ')+'</span><span class="webwear-small-details"><span class="webwear-searcher"> by '+s.user+'</span> - ';
			
			line_text += s.count + ' time';
			line_text += (s.count>1)?'s':'';
			
			line_text += "<span class='webwear-searchdate'> ("+date_html+")</span></span>"+
				"<br /></div>";
				
			var query_line = $(line_text);
							
			query_line.click(
				function(e){
					$.webWear.logVisit.addShortAction('search-execute-from-completion');
					
					//TODO make function to find searchfields
					var search_fields = $('[name=q]');

					//add in special for bing demo
					if (search_fields.length == 0){
						search_fields = $('#sb_form_q');
					}
					
					//update search field and submit
					$(search_fields[0]).val(
						$(this).find('.webwear-search').text()
					);
					
					//find parent form for search field
					var form = $(search_fields[0]).closest('form');
					form.submit();
				}
			);
			$.webWear.s.append(query_line);
			
			//stop filling if it's full
			if ($.webWear.s.children().length > 10){
				break;
			}
		}
		
}

//create an overlay that hides the page until everything is loaded
function createPageScreen(){
	if ($('#webwear-page-screen').length == 0){
		var pageScreen = $('<div id="webwear-page-screen"><BR /><BR />Page loading...</div>');
		pageScreen.css({
				'height': $(window).height()+'px',
				'width': $(window).width()+'px',
				'position': 'absolute',
				'right': '0',
				'top': $(window).scrollTop(),
				'background-color': '#fff',
				'z-index': '1000000',
				'margin-left': 'auto',
				'margin-right': 'auto',
				'display': 'table-cell',
				'vertical-align': 'middle',
				'align': 'center',
				'text-align': 'center'
			});
		

		$('body').append(pageScreen);
		pageScreen.show();
		
		//move overlay on scroll
		$(window).scroll(function(){
			$('#webwear-page-screen').css('top',$(window).scrollTop());//+17);
		});
		
		//resize overlay on scroll
		$(window).resize(function(){
			$('#webwear-page-screen').css('height',($(window).height()-5)+'px');//+17)+'px');
		});
	}
	
}

//create and add overlay if there isn't already one
function createWebWearOverlay(){
	if ($('#webwear-overlay').length == 0 && ($.webWear.visibilityOn|| $.webWear.socialnavOn)){
		$.webWear.o = $('<div id="webwear-overlay"></div>');
		$.webWear.o.css({
				'height': $(window).height()+'px',
				'width': '16px',
				'position': 'absolute',
				'right': '0',
				'top': $(window).scrollTop(),
				'background-color': '#000',
				'opacity': '0.5',
				'color': 'white',
				'z-index': '1000000'
			});
				
		
		if ($('body').hasScrollBar()){
			$('body').append($.webWear.o);
			$.webWear.o.show();
		}
		
		//move overlay on scroll
		$(window).scroll(function(){
			$.webWear.o.css('top',$(window).scrollTop());//+17);
		});
		
		//resize overlay on scroll
		$(window).resize(function(){
			$.webWear.o.css('height',($(window).height()-5)+'px');//+17)+'px');
			if ($.webWear.visibilityOn){
				displayLinkWear();
			}
			else if ($.webWear.socialnavOn){
				displayLinkRank();
			}
		});
	}
}

function displayLinkRank(){
	//get all unique links in the page
    //get only visible links with size
	var links = util.getPageLinks();

	//stores all info for links on the page
    $.webWear.wearPageRanks = [];
	
	if ($.webWear.vals[$.webWear.currentPage]){
		//look for the link in the page in the database 
		$.each(links, function(i,link){
						
			var href = util.parseCleanUrl(link.href);
			
			//FOR PAGES
			//match on filename 
			if ($.webWear.vals[$.webWear.currentPage]){
						
				//if there is a match then copy the info
				if (href in $.webWear.vals[$.webWear.currentPage].pageRanks && href !=$.webWear.currentPage){
					var newLink = $.extend({},$.webWear.vals[$.webWear.currentPage].pageRanks[href]);
					newLink.pageLink = link;
					$.webWear.wearPageRanks.push(newLink);
				}
			}
		});
	}
	
	$.webWear.wearCurrentPageRank = [];
		
	//REPEAT ABOVE BUT FOR THE CURRENT PAGE
	if ($.webWear.vals[$.webWear.currentPage]){
		
		//if there is a match then copy the info
		if ($.webWear.currentPage in $.webWear.vals[$.webWear.currentPage].pageRanks){
			var newLink = $.extend({},$.webWear.vals[$.webWear.currentPage].pageRanks[$.webWear.currentPage]);
			newLink.pageLink = $.webWear.currentPage;
			$.webWear.wearCurrentPageRank.push(newLink);
		}
	}
	
	createWebWearOverlay();
	
	//display link indicator at vertical point of link
	if ($.webWear.o){
		$.webWear.o.find('.webwear-pagerank-pos-ind').remove();
				
		$.each($.webWear.wearPageRanks, function(i,o){
			var linkTop = $(o.pageLink).offset().top;
			var pageHeight = ($('body').height()) ? $('body').height() : $(document).height(); 
			var viewportHeight = $(window).height() - 17;
			var scrollTop = $(window).scrollTop();

			var pctPageVis = (viewportHeight) / (pageHeight * 1.0);
			var relLinkPos = (linkTop+34) * pctPageVis; 

			if (relLinkPos > $.webWear.o.height()-17){
				relLinkPos = $.webWear.o.height()-5-17;
			}
			
			var linkInd = $('<div class="webwear-pagerank-pos-ind"></div>');
			linkInd.css({
				"position":"absolute",
				"width": "100%",
				"top":relLinkPos+"px",
				"height": "5px",
				"background-color": "firebrick",
				"cursor": "pointer",
				"z-index": "100000"
			});

			linkInd.click(
				function(e){
					$.webWear.logVisit.addShortAction('navigate-click-pagerank');
					$('body').scrollTop(linkTop);
				}
			);
			$.webWear.o.append(linkInd);
	   });
	}
	  
	//display page link annotations next to link
	$(document).find('.webwear-pagerank-annotation').remove();

	$.each($.webWear.wearPageRanks, function(i,o){
		var boundRect = $(o.pageLink).getRealRect();//o.pageLink.getBoundingClientRect();
		//var linkPos = $(o.pageLink).offset();
		var width = boundRect.width; //$(o.pageLink).width();
		//var height = boundRect.height;//$(o.pageLink).width();
		//var linkInd = $('<a class="linkAnnotation" href="#"></a>'); 
		var linkInd = $('<div class="webwear-pagerank-annotation"></div>'); 
		linkInd.css({
			"position":"absolute",
			"top":boundRect.top+1,
			"left":boundRect.left+width+1,
			"height": "6px",
			"width": "9px",
			'border': '1px solid black',
			'background-color':'white',
			"z-index": 100001
		});
		
		linkInd = fillAnnotation('pagerank',linkInd, o);

		//create reference to link
		linkInd.data('link', o.pageLink); 
		linkInd.mouseleave(
			function(e){
				$('.webwear-temp-link-highlight').remove();
				$.webWear.logVisit.endAction();
			}
		);
		
		linkInd.mouseenter(
			function(e){
				$.webWear.logVisit.startAction('link-pagerank-activity');
				var o = $(e.target).data('link');
				var boundRect = $(o).getRealRect();
				
				$('.webwear-temp-link-highlight').remove();
				var tempHighlight = $('<div class="webwear-temp-link-highlight"></div>');
				tempHighlight.css({
					height: boundRect.height,//$(link).height(),
					width: boundRect.width+1,//$(link).width(),
					border: "2px solid black",
					top: boundRect.top,//linkPos.top,
					left: boundRect.left-1,//linkPos.left,
					position: "absolute",
					"background-color": "white",
					opacity: 0.3,
					"z-index": 1000000
				});
				
				$('body').append(tempHighlight);
				
			}
		);		
		
		if (linkInd.children().length > 0){
			$('body').append(linkInd);
		}
			
	});
}

function displayLinkWear() {
    //get all unique links in the page
    //get only visible links with size
	var links = util.getPageLinks();
    
    //stores all info for links on the page
    $.webWear.wearLinks = [];
	$.webWear.wearDomains = [];
	
    //look for the link in the page in the database 
    $.each(links, function(i,link){
					
		var href = util.parseCleanUrl(link.href);
		
		//FOR PAGES
        //match on filename 
		if ($.webWear.vals[$.webWear.currentPage]){
					
			//if there is a match then copy the info
			if (href in $.webWear.vals[$.webWear.currentPage].pages && Object.keys($.webWear.vals[$.webWear.currentPage].pages[href].visitors).length > 0 && href !=$.webWear.currentPage){
				var newLink = $.extend({},$.webWear.vals[$.webWear.currentPage].pages[href]);
				newLink.pageLink = link;
				$.webWear.wearLinks.push(newLink);
			}
		}
		
		//FOR DOMAINS
		if ($.webWear.vals[$.webWear.currentPage]){
			var domain = util.parseDomain(link.href);
	
			//if there is a match then copy the info        
			if (domain in $.webWear.vals[$.webWear.currentPage].domains && Object.keys($.webWear.vals[$.webWear.currentPage].domains[domain].visitors).length > 0 && domain != $.webWear.currentDomain){
				var newLink = $.extend({},$.webWear.vals[$.webWear.currentPage].domains[domain]);
				newLink.pageLink = link;
				$.webWear.wearDomains.push(newLink);		
			} 
		}
		
    });//end for each link in DB
		
	$.webWear.wearCurrentPage = [];
	$.webWear.wearCurrentDomain = [];
		
	//REPEAT ABOVE BUT FOR THE CURRENT PAGE
	if ($.webWear.vals[$.webWear.currentPage]){
		
		//if there is a match then copy the info
		if ($.webWear.currentPage in $.webWear.vals[$.webWear.currentPage].pages){
			var newLink = $.extend({},$.webWear.vals[$.webWear.currentPage].pages[$.webWear.currentPage]);
			newLink.pageLink = $.webWear.currentPage;
			$.webWear.wearCurrentPage.push(newLink);
		}
	}
	
	//FOR DOMAINS
	if ($.webWear.vals[$.webWear.currentPage]){
		
		//if there is a match then copy the info        	
		if ($.webWear.currentDomain in $.webWear.vals[$.webWear.currentPage].domains){
			var newLink = $.extend({},$.webWear.vals[$.webWear.currentPage].domains[$.webWear.currentDomain]);
			newLink.pageLink = $.webWear.currentPage;
			$.webWear.wearCurrentDomain.push(newLink);
		}
	}
	
	createWebWearOverlay();
	
	
	//display link indicator at vertical point of link
	if ($.webWear.o){
		$.webWear.o.find('.webwear-link-pos-ind').remove();
				
		$.each($.webWear.wearLinks, function(i,o){
			var linkTop = $(o.pageLink).offset().top;
			var pageHeight = ($('body').height()) ? $('body').height() : $(document).height(); 
			var viewportHeight = $(window).height() - 17;
			var scrollTop = $(window).scrollTop();

			var pctPageVis = (viewportHeight) / (pageHeight * 1.0);
			var relLinkPos = (linkTop+34) * pctPageVis; 

			if (relLinkPos > $.webWear.o.height()-17){
				relLinkPos = $.webWear.o.height()-5-17;
			}
			
			var linkInd = $('<div class="webwear-link-pos-ind"></div>');
			linkInd.css({
				"position":"absolute",
				"width": "50%",
				"top":relLinkPos+"px",
				"height": "5px",
				"background-color": "darkmagenta",
				"cursor": "pointer",
				"z-index": "100000"
			});

			linkInd.click(
				function(e){
					$.webWear.logVisit.addShortAction('navigate-click-link');
					$('body').scrollTop(linkTop);
				}
			);
			$.webWear.o.append(linkInd);
	   });
	   
	   $.webWear.o.find('.webwear-domain-pos-ind').remove();
	   $.each($.webWear.wearDomains, function(i,o){
			var linkTop = $(o.pageLink).offset().top;
			var pageHeight = ($('body').height())?$('body').height():$(document).height(); 
			var viewportHeight = $(window).height()-17;
			var scrollTop = $(window).scrollTop();

			var pctPageVis = (viewportHeight) / (pageHeight * 1.0);
			var relLinkPos = (linkTop+34) * pctPageVis; 

			if (relLinkPos > $.webWear.o.height()-17){
				relLinkPos = $.webWear.o.height()-5-17;
			}
			
			var linkInd = $('<div class="webwear-domain-pos-ind"></div>');
			linkInd.css({
				"position":"absolute",
				"top":relLinkPos+"px",
				"right": "0px",
				"height": "5px",
				"width": "50%",
				"background-color": "forestgreen",
				"cursor": "pointer",
				"z-index": "1000001"
			});

			linkInd.click(
				function(e){
					$.webWear.logVisit.addShortAction('navigate-click-domain');
					$('body').scrollTop(linkTop);
				}
			);
			$.webWear.o.append(linkInd);
	   });
	}

	//display page link annotations next to link
	$(document).find('.webwear-link-annotation').remove();
	$.each($.webWear.wearLinks, function(i,o){
			var boundRect = $(o.pageLink).getRealRect();//o.pageLink.getBoundingClientRect();
			//var linkPos = $(o.pageLink).offset();
			var width = boundRect.width; //$(o.pageLink).width();
			//var height = boundRect.height;//$(o.pageLink).width();
			//var linkInd = $('<a class="linkAnnotation" href="#"></a>'); 
			var linkInd = $('<div class="webwear-link-annotation"></div>'); 
			linkInd.css({
				"position":"absolute",
				"top":boundRect.top+1,
				"left":boundRect.left+width+1,
				"height": "6px",
				"width": "9px",
				'border': '1px solid black',
				'background-color':'white',
				"z-index": 100001
			});
			
			linkInd = fillAnnotation('link',linkInd, o);

			//create reference to link
			linkInd.data('link', o.pageLink); 
			
			
			$('body').append(linkInd);

			//click event for opening dialog
			linkInd.mouseenter(handlePopupDisplayEvent);
			
			linkInd.mouseenter(function(e){
				$.webWear.logVisit.startAction('link-page-activity');

			});
	});

	//display domain annotations next to link
	$(document).find('.webwear-domain-annotation').remove();
	$.each($.webWear.wearDomains, function(i,o){
		var boundRect = $(o.pageLink).getRealRect();//o.pageLink.getBoundingClientRect();
		var width = boundRect.width; 
		
		/*var linkPos = $(o.pageLink).offset();
		var width = $(o.pageLink).width();
		var height = $(o.pageLink).width();*/
		
		var linkInd = $('<div class="webwear-domain-annotation"></div>'); 
		linkInd.css({
			"position":"absolute",
			"top":boundRect.top+1+9,
			"left":boundRect.left+width+1,
			"height": "6px",
			"width": "9px",
			'border': '1px solid black',
			'background-color':'white',
			"z-index": 10001
		});

		linkInd = fillAnnotation('domain',linkInd, o);
		
		//create reference to link
		linkInd.data('link', o.pageLink); 

		$('body').append(linkInd);

		//click event for opening dialog
		linkInd.mouseenter(handlePopupDisplayEvent);
		
		linkInd.mouseenter(function(e){
			$.webWear.logVisit.startAction('link-domain-activity');
		});
	});


	function handlePopupDisplayEvent(event) {
		var link = $(this).data('link');
		var targetAnnotation = $(event.target);
		
		//sometimes the child gets passed... reset to the parent in that case
		if (targetAnnotation.hasClass('webwear-annotation-fill')){
			targetAnnotation = $(targetAnnotation.parent());
			link = targetAnnotation.data('link');
		}
		
		var domainObject = null;
		var linkObject = null;
		
		event.preventDefault();

		var dialog = "";
		
		//remove any previous dialogs
		if ($('#webwear-dialog').size()){ 
			//$('#dialog').remove();
			
			dialog = $($('#webwear-dialog')[0]);
			
			if (!$(this).hasClass('webwear-dialog-control')){
				dialog.dialog('close');
			}
			
		}
		else{
			dialog = $('<div id="webwear-dialog"></div>');  
			$('body').append(dialog);
		}

		var ref_text = '';
		var isLinkAnnotationHover = false;
		
		//init visits for the last year
		var yearActivity = new Array(30);
		for (var i=0; i<yearActivity.length; i++) yearActivity[i] = 0;
		
		if (targetAnnotation.hasClass('webwear-link-annotation') || targetAnnotation.hasClass('webwear-poppup-link-annotation')) {
			isLinkAnnotationHover = true;
		
			//build html for pop-ups for found links
			$.each($.webWear.wearLinks, function(i,o){
				if (o.pageLink.href == link.href){
					ref_text = '<div class="webwear-link-annotation-details">';
					ref_text += '<div class="webwear-popup-title" style="margin-top: 0;"><div style="position: absolute; bottom: 0px;">activity on this page</div></div>';
					
					//restructure data
					var v = [];
					for (i in o.visitors){v.push({'user':i,'visits':o.visitors[i]})};
					
					//order by the person who has had the latest visit
					var visitors = Enumerable.From(v).OrderByDescending(
						function(x){
							var max = Enumerable.From(x.visits).Max(
								function(y){return new Date(y.startTime);}
							);
							
							return max;
						}
					)
					.OrderByDescending(
						function(x){ return new Date(x.visits[0].startTime);}
					)
					.ToArray();
					
					$.each(visitors, function(j,p){
						ref_text += create_link_annotation_text(p,'page',0,25);
						util.updateVisitsInLastTimePeriod(yearActivity, p,30);
					});
					ref_text += '</div>';
					
					//var linkPos = $(o.pageLink).offset();
					var boundRect = $(o.pageLink).getRealRect();//o.pageLink.getBoundingClientRect();
					
					
					$('.webwear-temp-link-highlight').remove();
					var tempHighlight = $('<div class="webwear-temp-link-highlight"></div>');
					tempHighlight.css({
						height: boundRect.height,//$(link).height(),
						width: boundRect.width+1,//$(link).width(),
						border: "2px solid black",
						top: boundRect.top,//linkPos.top,
						left: boundRect.left-1,//linkPos.left,
						position: "absolute",
						"background-color": "white",
						opacity: 0.3,
						"z-index": 1000000
					});
					//if (boundRect.top !=0 && boundRect.left!=0){
						$('body').append(tempHighlight);
					//}
					//$(o).data('ref', ref_text);
					
				}
			});
			ref_text = fix_ref_text(ref_text,25);
		}
		
		else if (targetAnnotation.hasClass('webwear-domain-annotation') || targetAnnotation.hasClass('webwear-poppup-domain-annotation')) {
			//build html for pop-ups for found links
			$.each($.webWear.wearDomains, function(i,o){
				if (o.pageLink.href == link.href){
					ref_text = '<div class="webwear-link-annotation-details">';
					ref_text += '<div class="webwear-popup-title" style="margin-top: 0;"><div style="position: absolute; bottom: 0px;">activity on '+(util.parseDomain(link.href))+'</div></div>';
					
					
					//restructure data
					var v = [];
					for (i in o.visitors){v.push({'user':i,'visits':o.visitors[i]})};

					
					//order by the person who has had the latest visit
					var visitors = Enumerable.From(v).OrderByDescending(
						function(x){
							var max = Enumerable.From(x.visits).Max(
								function(y){return new Date(y.startTime);}
							);
							
							return max;
						})
						.OrderByDescending(
							function(x){ return new Date(x.visits[0].startTime);}
						)
						.ToArray();
					//var activity = Enumerable.From(v).OrderByDescending(function(x){return new Date(x.visits[0].startDate);}).ToArray();
					
					$.each(visitors, function(j,p){
						ref_text += create_link_annotation_text(p,'domain',0,10);//domain
						util.updateVisitsInLastTimePeriod(yearActivity,p,30);
					});
					ref_text += '</div>';
					
					//var linkPos = $(o.pageLink).offset();
					var boundRect = $(o.pageLink).getRealRect();
					
					$('.webwear-temp-link-highlight').remove();
					var tempHighlight = $('<div class="webwear-temp-link-highlight"></div>');
					
					tempHighlight.css({
						height: boundRect.height,//$(link).height(),
						width: boundRect.width,//$(link).width(),
						border: "2px solid black",
						top: boundRect.top, //linkPos.top,
						left: boundRect.left, //linkPos.left,
						position: "absolute",
						"background-color": "white",
						opacity: 0.3,
						"z-index": 1000000
					});
					//if ($('.webwear-temp-link-highlight').length==0 && linkPos.top !=0 && linkPos.left!=0){
						$('body').append(tempHighlight);
					//}
				}
			});
			ref_text = fix_ref_text(ref_text,10);
		}
		
		//ref_text = fix_ref_text(ref_text);
				
		dialog.html(ref_text);
				
		$('.webwear-sparkline-container').remove();
		var sparklineContainer = $('<div class="webwear-sparkline-container"></div>');
			
		
		var sparkLine = $('<span class="webwear-sparkline">Loading..</span>');
		sparkLine.sparkline(yearActivity, {width: '100px', height: '25px', minSpotColor: '', maxSpotColor: '', fillColor: false});
		
		sparklineContainer.append(sparkLine);
		sparklineContainer.prepend("1m");
		sparklineContainer.append("now");
		
		
		//if (targetAnnotation.hasClass('webwear-link-annotation')){
			$(dialog.find('.webwear-popup-title')[0]).append(sparklineContainer);
		//}
		
		var hasLinkAnnotation = false;
		
		$.each($.webWear.wearLinks, function(i,o){
			if (o.pageLink.href == link.href){
				hasLinkAnnotation=true;
				linkObject = o;
			}
		});
		
		var hasDomainAnnotation = false;
		$.each($.webWear.wearDomains, function(i,o){
			if (o.pageLink.href == link.href){
				hasDomainAnnotation=true;
				domainObject = o;
			}
		});
		
		//add in nav icons
		if (hasLinkAnnotation){
			linkAnnotation = $('<div class="webwear-poppup-link-annotation webwear-not-selected webwear-dialog-control" style="position: absolute; height: 6px; width: 9px; top: 2px; left: 5px;"></div>');
			
			
			if (linkObject) linkAnnotation = fillAnnotation('link',linkAnnotation,linkObject);
			
			linkAnnotation.data('link',link);
			dialog.append(linkAnnotation);
		}
		
		if (hasDomainAnnotation){
			domainAnnotation = $('<div class="webwear-poppup-domain-annotation webwear-not-selected webwear-dialog-control" style="position: absolute; height: 6px; width: 9px;  top: 12px; left: 5px;"></div>');
			
			
			if (domainObject) domainAnnotation = fillAnnotation('domain',domainAnnotation,domainObject);
			
			domainAnnotation.data('link',link);
			dialog.append(domainAnnotation);
		}
			
		var indPos = util.findPosRelativeToViewport($(this)); 
		
		if (isLinkAnnotationHover){
			if (hasLinkAnnotation)
			{
				linkAnnotation.removeClass('webwear-not-selected'); 
				linkAnnotation.addClass('webwear-selected'); 
			}
			
			if (hasDomainAnnotation){
				domainAnnotation.mouseenter(handlePopupDisplayEvent);
				domainAnnotation.mouseenter(function(e){
					$.webWear.logVisit.startAction('link-domain-activity');
				});
				domainAnnotation.removeClass('webwear-selected');
				domainAnnotation.addClass('webwear-not-selected');		
			}
			
		}
		else{
			if (hasDomainAnnotation){
				domainAnnotation.removeClass('webwear-not-selected');
				domainAnnotation.addClass('webwear-selected');
			
			}
			
			if (hasLinkAnnotation){
				linkAnnotation.mouseenter(handlePopupDisplayEvent);
				
				linkAnnotation.mouseenter(function(e){
					$.webWear.logVisit.startAction('link-page-activity');
				});
				linkAnnotation.removeClass('webwear-selected');
				linkAnnotation.addClass('webwear-not-selected');
				
			}
			//domainAnnotation.css('border','1px solid black');
			indPos.top -= 14;
		}
		

		if (!dialog.parents(".ui-dialog").is(":visible")){
			$.fx.speeds._default = 1000; 
			dialog.dialog({                                   
				autoOpen: false,
				modal: false,
				width: 350,
				position: [indPos.left-8,indPos.top-5],
				resizable: false
			});
			
			dialog.parent().find('.ui-dialog-titlebar').hide();
			dialog.dialog("open");

			
			
			//on entering the dialog an exit event
			//$("#dialog").parent().mouseenter(function(e1){
			dialog.parent().mouseleave(function(e2){
				//if ($("#dialog")!=$(this) && $("#dialog").children()!=$(this)){
				 $.webWear.logVisit.endAction();
				 $("#webwear-dialog").dialog("close");
				 
				 $(".webwear-temp-link-highlight").remove();
				//}
			});
		}
		
		
		//address jquery ui bugs.. keep dialog on top, make link blue and remove focus
		dialog.parent().css('z-index','1000003');
		dialog.find('.webwear-dialog-expand-link').css('color','blue').blur();
		
		$('.webwear-dialog-expand-link').click(function(e){
			$.webWear.logVisit.addShortAction('expand-dialog-details');
			handleExpandActivityDetails(e);
		});
		
		dialog.parent().click(
			function(e){
				setTimeout(function(){
					$('#webwear-dialog').parent().css('z-index','1000003')},1);
			}
		);
		
		$.sparkline_display_visible();
		
		//});
	} //close click
}//end displayLinkWear

function fillAnnotation(type, linkInd, o){
	var peopleCount = 0;
	var daysAgo = 0;
	
	var linkColors = ['#D199D1','#AE4DAE','#6F006F'];
	var domainColors = ['#A7D1A7','#4EA24E','#1B6F1B'];
	var pageRankColors = ['#B22222','#B22222','#B22222'];//same no time data
	
	var colorSet = [];
	
	if (type === 'link'){
		colorSet = linkColors;
	
		if (typeof o !== 'undefined' && 'visitors' in o && Object.keys(o.visitors).length > 0){
			
			//flatten visits
			var visits = [];
			
			for (i in o.visitors){
				visits = visits.concat(o.visitors[i]);
				peopleCount++;
			}
			
			//peopleCount = visits.length;
			
			//get the most recent activity
			var mostRecentActivity = Enumerable.From(visits).
				Max(
					function(x){
						return new Date(x.startTime);
					}
				);
				
			daysAgo = util.daysAgo(mostRecentActivity);
		}
	}
	
	else if (type === 'pagerank'){
		colorSet = pageRankColors;
		daysAgo = 0;
		if (o.rank >= 7){
			peopleCount = 3; 
		}
		else if (o.rank >= 4){
			peopleCount = 2;
		}
		else if (o.rank >= 1){
			peopleCount = 1;
		}
		else{
			peopleCount = 0;
		}
	}
	
	else{
		if (typeof o !== 'undefined' && 'visitors' in o && Object.keys(o.visitors).length > 0){
			colorSet = domainColors;
						
			//flatten visits
			var visits = [];
			
			for (i in o.visitors){
				visits = visits.concat(o.visitors[i]);
				peopleCount++;
			}
			
			//peopleCount = visits.length;
			
			//get the most recent activity
			var mostRecentActivity = Enumerable.From(visits).
				Max(
					function(x){
						return new Date(x.startTime);
					}
				);
				
			daysAgo = util.daysAgo(mostRecentActivity);
		}
	}
	
	
	
	var fill = $('<div class="webwear-annotation-fill"></div>');
	fill.mouseenter(
		function(e){
			var t = e.target;
			
			$(t).parent().trigger(new $.Event('mouseenter'));
		}
	);
	
	//for recency
	if (daysAgo <= 7){
		fill.css('background-color',colorSet[2]);
	}
	else if (daysAgo <= 30){
		fill.css('background-color',colorSet[1]);
	}
	else{
		fill.css('background-color',colorSet[0]);
	}
	
	//for visitors
	if (peopleCount >=3){
		fill.css({
			'height': '100%',
			'width': '100%'
		});
	}
	else if (peopleCount == 2){
		var pctW = .70;
		var pctH = .70;
		
		while (linkInd.width() - linkInd.width() * pctW < 1){
			pctW -= .01;
		}
		pctW *= 100;
		
		while (linkInd.height() - linkInd.width() * pctH < 1){
			pctH -= .01;
		}
		pctH *= 100;
		
		fill.css({
			'height': '100%',
			'width': pctW+'%'
		});
	}
	else{
		var pctW = .45;
		var pctH = .45;
		
		while (linkInd.width() - linkInd.width() * pctW < 3){
			pctW -= .01;
		}
		pctW *= 100;
		
		while (linkInd.height() - linkInd.width() * pctH < 3){
			pctH -= .01;
		}
		pctH *= 100;
		
		fill.css({
			'height': '100%',
			'width': pctW+'%'
		});
	}

	if (peopleCount > 0){
		linkInd.append(fill);
	}
	
	return linkInd;
}

function create_link_annotation_text(o,type,offset,limit){
	if (typeof limit =='undefined'){
		limit=10000000;
	}
	if (typeof offset =='undefined'){
		offset=0;
	}
	
    var user_activity_container = '';
    var summary = '';
	
	var picture_container = '';
	
    user_activity_container += '<div class="webwear-user-activity-container">';

	var pic = util.getPortrait(o.user);
	
	if (pic){
		picture_container += '<div class="webwear-portrait"><img src="'+pic+'" alt="'+o.user+'" style="width: 25px" /><br/>'+o.user+'</div>';
	}
	
	var total_duration = 0;
	var last_visit = new Date();
	var visit_count = 0;
	var display_count = 0;
	
	last_visit.setFullYear(1990,0,1);
	
	var user_activity_details = '<div class="webwear-user-activity-detail-container">';
	
	var links = '<div style="width: 100%; height: 15px; padding-top: 5px"> ';
	
	//need pervious button
	//if (offset > 0){
		links += '<a href="javascript: return false;" class="webwear-link-details-nav-prev" style="float: left;">&lt;Prev '+limit+'</a>'
	//}
	//need next button
	//if (visit_count > offset + limit){
		links += '<a href="javascript: return false;" class="webwear-link-details-nav-next" style="float: right;">Next '+limit+'&gt;</a>'
	//}

	//add the nav links and close the activity deatils div
	user_activity_details = user_activity_details + links + "</div>";
	var domain_activity_details = "";
	
	//var visits = Enumerable.From(o.visits).OrderByDescending(function(x){ return new Date(x.startTime);}).ToArray();
	var visitGroups = Enumerable.From(o.visits)
						.OrderByDescending(function(x){ return new Date(x.startTime);})
						.GroupBy(function(x){if (x.title.length>0){return x.title;}else {return x.cleanUrl;}})
						.OrderByDescending(function(x){ return new Date(x.First().startTime);})
						.ToArray();	
	
	$.each(visitGroups, function(i,visits){
		var page_visit_count = 0;
		var page_visit_duration = 0;
		
		//if (type !='domain' || (type=='domain' && 'title' in visits.First() && visits.First().title.length > 0)){
		if (type == 'domain'){
			user_activity_details += '<div class="webwear-history-domain-visit-container webwear-user-activity-detail-group'+(Math.floor(display_count/limit))+'">';
			user_activity_details += '<a class="webwear-history-link" href="'+visits.First().rawUrl+'" ';
			
			if (visits.First().title.length > 0){
				user_activity_details += 'title="'+visits.First().title+'">'+ util.trimLinkText(visits.First().title);
			}
			else{
				user_activity_details += 'title="'+visits.First().cleanUrl+'">'+util.trimLinkText(visits.First().cleanUrl);
			}
			
			user_activity_details += '</a><br />';
			
			domain_activity_details = '<div class="webwear-history-domain-visit" style="display: none;">';
			display_count++;
		}
	
		$.each(visits.source, function(j,v){
			//if (i>=offset && i < limit){
				var temp = '';
			
				temp += '<div class="webwear-user-activity-detail-group'+(Math.floor(display_count/limit))+'">';
				
				/*if (type == 'domain'){
					domain_activity_details += '<a class="webwear-history-link" title="'+v.title+'" href="'+v.rawUrl+'">'+util.trimLinkText(v.title)+'</a>';
				}*/
				
				temp +=' -'+$.time_from_seconds(v.length/1000)+','; 
				page_visit_duration += v.length;
									
				//add to total visit time
				total_duration += v.length;
						
				//get time - format into ISO 8601 timestamp
				var date = new Date(v.startTime);
				temp += ' <abbr class="timeago" title="'+date.toString()+'">'+$.timeago(date)+'</abbr>';
				temp +='<br />';
				
				//is this the most recent visit
				if (last_visit < date){
					last_visit = date;
				}
										
				temp += '</div>';
			//}
				if (type == 'domain'){
					domain_activity_details += temp;
				}
				else{
					user_activity_details += temp;
					display_count++;
				}
			page_visit_count++;
			visit_count++;
		});
		if (type == 'domain'){
			user_activity_details += "-<strong>"+page_visit_count+" visits</strong> ("+$.time_from_seconds(total_duration/1000)+ "), ";
			user_activity_details += "<em>last visit: ";
			
			//get time - format into ISO 8601 timestamp
			var date = new Date(visits.First().startTime);
			user_activity_details += ' <abbr class="timeago" title="'+date.toString()+'">'+$.timeago(date)+'</abbr>';
			user_activity_details += '</em> <a href="javascript: return false;" class="webwear-show-domain-visits-details">+</a><div class="webwear-spacer" style="height:5px"></div>';
			
			user_activity_details += domain_activity_details + "</div></div>";
		}
		//}
	});
	
	summary += '<div id="webwear-user-activity-summary"><strong>'+visit_count+" visit";
	summary += (visit_count > 1) ? 's': '';
	if (type == 'domain'){
		summary += " to "+display_count+" page";
		summary += (display_count > 1) ? 's': '';
	}
	else{
		summary += " to this page";
	}
	summary += '</strong>';
	summary += '<span class="webwear-small-details"> ('
	summary += $.time_from_seconds(total_duration/1000)+')<br /><em>last visit: <abbr class="timeago" title="'+last_visit.toString()+'">'+$.timeago(last_visit)+'</abbr></em></span>';
	summary += ' <span class="webwear-smaller-details"> <a href="javascript: return false;" class="webwear-dialog-expand-link">+</a></span></div>';
	
	user_activity_container += picture_container + summary + user_activity_details+"</div></div><hr />";
	
    return user_activity_container;
}


function create_domain_annotation_text(o){
    var html = '';
    var picture_container = '';
	
	var user_activity_container = '<div class="webwear-user-activity-container">';
	
	var user_activity_details = '<div class="webwear-user-activity-detail-container">';
	
    html +=	'<div class="webwear-user-activity-summary">';
	
	var pic = util.getPortrait(o.name);
	
	if (pic){
		picture_container += '<div class="webwear-portrait"><img src="'+pic+'" alt="'+o.name+'" style="width: 25px" /><br/>'+o.name+'</div>';
	}
	
	var v = o.visits;
    html += '<strong>'+ v.page_visits+ ' pages visited </strong>';
	html += ' <span class="webwear-small-details">('+$.time_from_seconds(v.length)+')<br /><em>'; 
	
	//get time - format into ISO 8601 timestamp
	var date = new Date(v.date);
	html += 'last visit: <abbr class="timeago" title="'+date.toString()+'">'+$.timeago(date)+'</abbr>';

	if (v.forms_completed){
		html += ', completed '+v.forms_completed+ ' forms';
	}
	
	html += '</em></span>';
	html += ' <span class="webwear-smaller-details"><a href="javascript: return false;" class="webwear-dialog-expand-link">+</a></span>';
	
    return user_activity_container+picture_container+html+user_activity_details+'</div></div></div>';
}




