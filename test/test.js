const Nightmare = require('./../lib/app');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'oxoftmed_myscout',
  password: '1',
  port: 5432
});

class Profiles extends Nightmare {
  constructor(data = false){
    super(pool, 'profiles', data);
    this.user_id = 1;
  }

  async user(instanceOf = false){
    return await this.belongsTo(instanceOf, 'user_id', 'id', 'users');
  }
}
class User extends Nightmare {
  constructor(data = false){
    super(pool, 'users', data);
    this.id = 1;
  }
  async profile(instanceOf = false){
    return await this.hasOne(instanceOf, 'id', 'user_id', 'profiles');
  }
}

class Video extends Nightmare {
  constructor(data = false){
    super(pool, 'videos', data);
  }

  async comments(instanceOf = Comment, sort = 'ASC'){
    return await this.hasMany(instanceOf, 'id', 'video_id', 'comments', sort);
  }
  hashtags(instanceOf = Hastag, sort = 'ASC'){
    return this.belongsToMany(instanceOf, 'hashtag__videos', 'hashtags', 'video_id', 'hashtag_id', sort);
  }
}

class Comment extends Nightmare {
  constructor(data = false){
    super(pool, 'comments', data);
  }
  async video(instanceOf = false){
    return await this.belongsTo(instanceOf, 'video_id', 'id', 'videos');
  }
}

class Hastag extends Nightmare {
  constructor(data = false){
    super(pool, 'hashtags', data);
  }
  videos(instanceOf = Video, sort = 'ASC'){
    return this.belongsToMany(instanceOf, 'hashtag__videos', 'videos', 'hashtag_id', 'video_id', sort);
  }
}
let vid = new Video();
let com = new Comment();
let hash = new Hastag();
// let pro = new Profiles(), user = new User();
// user.profile().then(profile => console.log(profile));
// pro.user().then(user => console.log(user));
// vid.id = 1;
// vid.comments().then(comments => console.log(comments));
hash.id = 322;
hash.videos(false, 'desc').then(videos => console.log(videos));
