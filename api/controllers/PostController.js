/**
 * PostController
 *
 * @module		:: Controller
 * @description	:: Contains logic for handling requests.
 */

var util = require('util');
var actionUtil = require('../../node_modules/sails/lib/hooks/blueprints/actionUtil');


module.exports = {

  list: function list(req,res) {

    Post.find()
    .where( actionUtil.parseCriteria(req) )
    .limit( 10 )
    .skip( actionUtil.parseSkip(req) )
    .sort('updatedAt DESC')
    .populate('images')
    .populate('sharedIn')
    .populate('sharedWith')
    // TODO params in populate comment dont are working well, fix it!
    //.populate('comments', { limit: 2, sort: 'createdAt asc' })
    .exec(function(err, posts) {
      if (err) return res.serverError(err);
        var meta = {};

        sails.log.info('posts',posts);

        //fetch metadata and some comments for every post
        async.each(posts, function(post, nextPost){
          Comment.getCommentsAndCount(post.id, function(err, comments, commentCount){
            if (err) return res.serverError(err);

            post.meta = {};
            post.meta.commentCount = commentCount;
            post._comments = [];

            post._comments = comments.reverse();

            nextPost();
          });

        },function(){
            res.send({
              post: posts,
              meta: meta
            });
        });
    });
  },

  createRecord: function createRecord(req, res) {

    var Model = Post;

    // Create data object (monolithic combination of all parameters)
    // Omit the blacklisted params (like JSONP callback param, etc.)
    var data = actionUtil.parseValues(req);

    // Create new instance of model using data from params
    Model.create(data).exec(function created (err, newRecord) {

      // Differentiate between waterline-originated validation errors
      // and serious underlying issues. Respond with badRequest if a
      // validation error is encountered, w/ validation info.
      if (err) return res.negotiate(err);

      Model.findOne(newRecord[Model.primaryKey])
        .populate('images')
        .populate('sharedIn')
        .populate('sharedWith')
      .exec(function found(err, newInstance) {

        if (err) return res.serverError(err);
        if (!newInstance) return res.notFound();

        // If we have the pubsub hook, use the model class's publish method
        // to notify all subscribers about the created item
        if (req._sails.hooks.pubsub) {
          if (req.isSocket) {
            Model.subscribe(req, newInstance);
            Model.introduce(newInstance);
          }
          Model.publishCreate(newInstance, !req.options.mirror && req);
        }

        // Send JSONP-friendly response if it's supported
        // (HTTP 201: Created)

        var resultObject = {};

        resultObject['post'] = newInstance;

        res.status(201);
        res.ok(resultObject);
      });

    });
  }
};
