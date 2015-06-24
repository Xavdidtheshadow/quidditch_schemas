module.exports = function(app) {
  var mongoose = require('mongoose');
  var Person = mongoose.model('Person');
  var Game = mongoose.model('Game');
  var Team = mongoose.model('Team');

  app.get("/people", function(req, res, next){
    Person
      .find()
      .populate('teams')
      .exec(function(err, people){
        if(err){return next(err);}
        // don't care about league right now
        // var opts = {
        //   path: 'team.league',
        //   model: 'League',
        //   select: 'name abbreviation'
        // };
        // // nested populate
        // Person.populate(people, opts, function(err, people){
        //   if(err){return next(err);}

        res.json(people);
        // });
      });
  });

  app.get("/people/head_referees", function(req, res, next){
    Person
      .find({"certifications.hr": true})
      .populate('team')
      .exec(function(err, people){
        if(err){return next(err);}

          res.json(people);
        });
  });

  app.get("/people/snitches", function(req, res, next){
    Person
      .find({"certifications.snitch": true})
      // .populate('team')
      .exec(function(err, people){
        if(err){return next(err);}

          res.json(people);
        });
  });

  app.get("/people/:id/games", function(req, res, next){
    Person
      .findOne({"_id": req.params.id})
      .populate('team')
      .exec(function(err, person){
        if(err){return next(err);}
        if (!person){res.status(404).send('Person not found');}
        else {
          Game
            .find({$or: [
              {head_referee: person._id},
              {snitch: person._id},
              {team_a: person.team._id},
              {team_b: person.team._id},
              {crews: {$in: person.crews}}
            ]})
            .populate('team_a team_b head_referee snitch')
            .exec(function(err, games){
              if(err){return next(err);}

              res.json({games: games, ref: person});
            });
          }
      });
  });

  app.get("/people/:q", function(req, res, next) {
    var query = {};
    if (req.params.q.match(/@/)){
      query = {"email": req.params.q};
    }
    else if (req.params.q.match(/ /)){
      query = {"name": req.params.q};
    }
    else {
      query = {"_id": req.params.q};
    }     

    Person
      .findOne(query)
      .populate('team')
      .exec(function(err, person){
        if(err){return next(err);}
        if (!person){res.status(404).send('Person not found');}

        res.json(person);
      });
  });

  app.put("/people/:id/certify/:test", function(req, res, next){
    // multiple steps to use a variable as an object key
    var to_update = {};
    to_update["certifications." + req.params.test] = true;

    Person
      .update({"_id": req.params.id}, to_update)
      .exec(function(err, person){
        if(err){return next(err);}

        if(person.length > 0) {
          res.json({status: 200, message: 'ok'});
        }
        else {
          res.status(404).send('Person not found');
        }
      });
  });

  app.post("/people", function(req, res, next){
    console.log(req.body)
    var p = new Person(req.body);

    // console.log(req.body);

    p.save(function(err, pers){
      if(err){return next(err);}

      res.json({status: 201, message: pers._id});
    });
  });

  app.get('/crews', function(req, res, next){
    Person.aggregate([{
      $project: {
        name: 1,
        crews: 1,
        team: 1,
        hr: {$cond: {if: "$certifications.hr", then: true, else: false}},
      }}, { 
      $group: {
        _id: "$crews",
        size: {$sum: 1},
        team: {$first: "$team"},
        hr: {$addToSet: "$hr"}
      }}, {
      $project: {
        hr: {$anyElementTrue: "$hr"},
        size: 1,
        team: 1
        // _id: {$first: "$crews"}
      }}, {
      $sort: {
        _id: 1
      }}
    ])

    .exec(function(err, crews){
      if(err){return next(err);}
      var singleIds = [];
      Team.populate(crews, {path: "team"}, function(err, crews){
        if(err){return next(err);}

        crews.forEach(function(e){
          // don't want subdocs
          e._id = e._id[0];
          // e.team = e.team.name;
          singleIds.push(e);
        });
        res.json(singleIds);
      });
    });
  });

  app.get('/crews/:id', function(req, res, next){
    // only words for 3 character crews
    var raw = req.params.id.toUpperCase();
    console.log(raw);
    var id = raw.slice(0,raw.length-1) + raw[raw.length-1].toLowerCase();
    Person
      .find({crews: id})
      .populate('team')
      .exec(function(err, crew){
        if(err){return next(err);}
        if (!crew){res.status(404).send('Crew not found');}

        res.json({crew: id, people: crew});
      });
  });

  app.get('/crews/:id/games', function(req, res, next){
    // only words for 3 character crews
    var raw = req.params.id.toUpperCase();
    var id = raw.slice(0,raw.length-1) + raw[raw.length-1].toLowerCase();
    var query = id;
    if (id[id.length-1] === 'a') {
      console.log('npr');
      id = ['A'+id.slice(1,id.length), 'B'+id.slice(1,id.length)]; 
      console.log(id);
      query = {$in: id};
    }
    Game
      .find({crews: query})
      .populate("team_a team_b head_referee snitch")
      .exec(function(err, games){
        if(err){return next(err);}
        if (!games){res.status(404).send('Crew not found');}

        res.json({crew: id, games: games});
      });
  });
};