$(document).ready(loadHistory);
			
function loadHistory(){
	var getUrl = WebWearData+'/_find?batch_size=10000&sort={"startTime":-1}';
	var data = {"criteria": JSON.stringify({user: localStorage['username']})};

	$.ajax(
		{
			data: data,
			type: 'GET',
			url: getUrl, 
			success: displayHistory,
			async:true,
		}
	);
}
function displayHistory(data){
	if (data && 'ok' in data  && data.ok == 1){
		var h = $('#history');
		h.empty();
		
		h.append('<input type="button" id="delete" value="delete selected" /> <br /><br />');
		
		h.append('<input type="checkbox" id="selectall"> <small>select all</small><br />');
		
		$.each(data.results, function(i,r){
			var text = '<span><input type="checkbox" id=\''+JSON.stringify(r._id)+'\' class="item" />';
			
			//get date
			var d = new Date(r.startTime);
			d = d.toLocaleDateString() + ' - '+d.toLocaleTimeString();
			
			text+='<small>'+d+'</small> -- <a href="'+r.rawUrl+'" target="_blank">'+r.title+'</a><br /></span>';
			
			
			var t = $(text)
			
			t.data('search',r.search);
			h.append(t);
			
			//h.find('#'+JSON.stringify(r._id)).data('search',r.search);
		});
		
		h.find('#selectall').click(function(){
			if ($(this).prop('checked')){
				$('.item').prop('checked',true);
			}
			else{
				$('.item').prop('checked',false);
			}
		});
		h.find('#delete').click(function(){
			var selected = [];
			var selected_search = [];
			
			$('.item').each(function(j,s){
				if ($(s).prop('checked')){
					selected.push(JSON.parse(s.id));
					selected_search.push(decodeURIComponent($(s).parent().data('search')).replace('+', ' '));
				}
			});
			
			
			if (selected.length > 0){
				var answer = confirm('Are you sure you want to permanently delete the selected items?\n\nPress OK to continue, Cancel to abort.');
				
				if (answer){
					var getUrl = WebWearData+'/_remove';
					
					var searchUrl = WebWearData+'search/_remove';
					
					var data = {"criteria": JSON.stringify({_id: {$in:selected}})};
	
					var searchData = {"criteria": JSON.stringify({search: {$in:selected_search}})};
	
					$.ajax(
						{
							data: searchData,
							type: 'POST',
							url: searchUrl, 
							async:true
						}
					);
	
					$.ajax(
						{
							data: data,
							type: 'POST',
							url: getUrl, 
							success:loadHistory,
							async:true,
						}
					);
				}
			}
			else{
				alert('You haven\'t selected anything to delete.');
			}
			
		});
	}
	else{
		alert('error getting your history');
	}
}

