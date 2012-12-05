$(document).ready(
				function(){
					$('#set').click(function(){
						var username = $('#username').val();
						if (username && username != ''){
							localStorage['username'] = username;
							localStorage['visibilityOn'] = 'true';
							localStorage['trackingOn'] = 'true';
							alert('Thanks '+username+'! Please send a small avatar or headshot to your WebWear admin for use in the system.');
							window.close();
						}
						else{
							alert('enter a username first!');
						}	
					});
				
				}
			
			);
			