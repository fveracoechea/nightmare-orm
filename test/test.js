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

  async comments(sort = 'ASC', instanceOf = Comment){
    return await this.hasMany(instanceOf, 'id', 'video_id', 'comments', sort);
  }
  hashtags(sort, instanceOf = Hastag){
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
  videos(sort, instanceOf = Video){
    return this.belongsToMany(instanceOf, 'hashtag__videos', 'videos', 'hashtag_id', 'video_id', sort);
  }
}
let vid = new Video();
let com = new Comment();
let hash = new Hastag();
let pro = new Profiles();
// let pro = new Profiles(), user = new User();
// user.profile().then(profile => console.log(profile));
// pro.user().then(user => console.log(user));
// vid.id = 1;
// vid.comments().then(comments => console.log(comments));

vid.find(12)
.then(async video => {
  // console.log(video.toJson())
  let result = await video.save();
  console.log(result)
})
.then(hashtags => console.log(hashtags));


(async ()=>{
  // await pro.find(100);
  // let affectedRows = await pro.delete();
  // console.log(affectedRows)

  // pro
  // .select('*')
  // .join('videos', 'videos.user_id', 'profiles.id')
  // .join('views', 'views.video_id', 'videos.id')
  // .where({ 
  //   profiles: {
  //     id:1, 
  //     asd:'asd'
  //   },
  //   videos: {
  //     profile_id: 2
  //   }
  // })
  // .orderBy('user_id', 'desc')
  // .limit(12)
  // .execute();
  // let hashtaghs = await 
  // hash.select('hashtags.*')
  // .join('hashtag__videos', 'hashtag__videos.hashtag_id', 'hashtags.id')
  // .join('videos', 'hashtag__videos.video_id', 'videos.id')
  // .where({ videos: { id: 2 } })
  // .orderBy('id', 'desc')
  // .execute();
  // console.log(hashtaghs)
})(); 
