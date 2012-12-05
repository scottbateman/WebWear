$(document).ready(function() {
				addEventHandlers();
				populateForms();
				
			});
			
			function addEventHandlers(){
				$('#history').click(
					function(){
						chrome.tabs.create({'url': chrome.extension.getURL('history.html')});
					}
				);
				
				$('#tracking-on').click(
					function(e){
						localStorage['trackingOn'] = $('#tracking-on').prop('checked').toString();
					}
				)
				$('#seewear').click(
					function(e){
						if ($('#seewear').prop('checked')){
							localStorage['visibilityOn'] = 'true';
							
						}
						else{
							localStorage['visibilityOn'] = 'false';
							
						}
					}
				);
					
					
				$('#set-username').click(
					function(e){
						var username = $('#username').val();
						if (username && username!=''){
							localStorage['username'] = username;
							alert('Wear Username updated');
						}
						else{
							alert('Please enter a value for the username and try again.');
						}
					}
				);
				
				$('#set-collection').click(
					function(e){
						var username = $('#collection').val();
						if (collection && collection!=''){
							localStorage['collectionPrefix'] = username;
							alert('Wear collection was updated');
						}
						else{
							alert('Please enter a value for the collection and try again.');
						}
					}
				);
			}
			
			function populateForms(){
				var trackingOn = (localStorage['trackingOn'] == 'true');
				$('#tracking-on').prop('checked',trackingOn);
								
				var visibilityOn = (localStorage['visibilityOn'] == 'true');
				
				if (visibilityOn){
					$('#seewear').prop('checked',true);
				}
											
				var username = localStorage['username'];
				$('#username').val(username);
				
				var collection = localStorage['collectionPrefix'];
				$('#collection').val(collection);
				
				//get unique users and populate the user filter
				$.ajax(
					{
						type: 'GET',
						url: WebWearData+'/_distinct?criteria={"key":"user"}', 
						success: handleGetUniqueUsers, 
						async:true
					}
				);
				
				
			}
			
			function handleGetUniqueUsers(data){
				$.each(data.values,function(i,user){
					var userObject = $('<div class="webwear-filter-user" id="'+user+'"></div>'); 
					
					var filterUsers = JSON.parse(localStorage['filterUsers']);
					
					var img = util.getPortrait(user);
					var imgObject = '<img class="webwear-filter-user-img" src="'+img+'" alt="'+img+'\' pic" />';
					
					userObject.append(imgObject);
					userObject.append('<smaller>'+user+'</smaller>');
					
					userObject.click(
						function(e){
							var username = $(this).data('username');
							var filterUsers = JSON.parse(localStorage['filterUsers']);
							
							if ($(this).hasClass('webwear-people-selected')){
								$(this).removeClass('webwear-people-selected');
								$(this).addClass('webwear-people-not-selected');
								
								//add the user to the list of people to exclude
								filterUsers.push(username);
							}
							else{
								$(this).addClass('webwear-people-selected');
								$(this).removeClass('webwear-people-not-selected');
								
								//remove the user from the list of filtered users
								var index = filterUsers.indexOf(username);
								filterUsers.splice(index,1);
							}
							
							localStorage['filterUsers'] = JSON.stringify(filterUsers);
						}
					);
					
					if ($.inArray(user,filterUsers) != -1){
						userObject.addClass('webwear-people-not-selected');
					}
					else{
						userObject.addClass('webwear-people-selected');
					}
					
					userObject.data('username',user);
					
					$('#webwear-people-filter').append(userObject);
					
				});
			}
		