var mongoose = require('mongoose');

var TeamSchema = new mongoose.Schema({
  // _id, generated by mongo
  name: {type: String, required: true}, 
  league: {type: mongoose.Schema.Types.ObjectId, ref: "League"},
  rank: Number,
  flight: Number
});

mongoose.model('Team', TeamSchema);