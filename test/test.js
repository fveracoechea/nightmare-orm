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

  user(returnInstance = false){
    return this.belongsTo(User, 'user_id', 'id', returnInstance);
  }
}
class User extends Nightmare {
  constructor(data = false){
    super(pool, 'users', data);
    this.id = 1;
  }
  profile(returnInstance = false){
    return this.hasOne(Profiles, 'id', 'user_id', returnInstance);
  }
}

class Video extends Nightmare {
  constructor(data = false){
    super(pool, 'videos', data);
  }

  comments(returnInstance = false, sort = 'ASC'){
    return this.hasMany(Comment, 'id', 'video_id', sort, returnInstance);
  }
  hashtags(sort = 'asc', returnInstance = false){
    return this.belongsToMany(Hastag, 'hashtag__videos', {
      pivotOwnerKey: 'video_id',
      pivotRelationalKey: 'hashtag_id',
    }, sort, returnInstance);
  }
}

class Comment extends Nightmare {
  constructor(data = false){
    super(pool, 'comments', data);
  }
  video(instanceOf = false){
    return this.belongsTo(instanceOf, 'video_id', 'id', 'videos');
  }
}

class Hastag extends Nightmare {
  constructor(data = false){
    super(pool, 'hashtags', data);
  }
  videos(returnInstance = false, sort = 'asc'){
    return this.belongsToMany(Video, 'hashtag__videos', {
      localPrimaryKey:'id', 
      pivotOwnerKey:'hashtag_id', 
      pivotRelationalKey:'video_id', 
      foreignPrimaryKey:'id',
    }, sort);
  }
}
// let vid = new Video();
let com = new Comment();
let hash = new Hastag();
let pro = new Profiles();
// let pro = new Profiles(), user = new User();
// user.profile().then(profile => console.log(profile));
// pro.user().then(user => console.log(user));
// vid.id = 1;
// vid.comments().then(comments => console.log(comments));

(async ()=>{
  // await pro.find(100);
  // let affectedRows = await pro.delete();
  // console.log(affectedRows)

  // let res = await  pro
  //                   .select('user_id', 'lastname', 'type')
  //                   .where({ country_id: 5, type: 'SCOUT' })
  //                   .execute();
  try {
    let vid = new Video();
    let res = await vid
      .select('id')
      .where('asd', {hola: 'asdasd'}, '!=')
      .where('id', 176, '!=')
      .where('id', 175, '!=')
      .limit(3)
      .offset(3)
      .orderBy('id', 'desc')
      .execute();
    console.log(res);
  } catch (error) {
    console.error(error);
  }
})(); 
