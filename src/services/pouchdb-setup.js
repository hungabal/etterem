// PouchDB setup with proper ES module handling
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';

// Register plugins
PouchDB.plugin(PouchDBFind);

// Export the configured PouchDB
export default PouchDB; 