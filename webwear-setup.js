
WebWearDebug = false;									//set to view debug messages in the console

WebWearDBServer = 'http://yourdbservername.com:port';	//the fully formed address to the location of the SleepyMongoose Server (use scottbateman's fork)

WebWearDB = 'webwear';									//the name of the MongoDB database to use

WebWearCollection = 'default';							//allows multiple profiles to work within the same database collection, by adding a string prefix to the standard collection name

WebWearData = WebWearDBServer+'/'+WebWearDB+'/'+WebWearCollection;

WebWearImageServer = 'http://yourimgservername.com/path'; //the path to the server and directory containing the avatars for the user... files are named "username.jpg"

