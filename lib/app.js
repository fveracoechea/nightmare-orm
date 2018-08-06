'use strict';
const QueryBuilder = require('./QueryBuilder');

class Nightmare extends QueryBuilder{
  constructor(pool, table, data = false){
    if(!pool) throw new Error('Nightmare Constructor "pool" is undefined');
    if(!table) throw new Error('Nightmare Constructor "table" is undefined');
    super(pool, table);
    this.pool = pool;
    this.table = table;
    this.fillable = [];
    this.jsonRows = [];
    if(data && typeof data === 'object') this.fill(data);
  }
  //fill json data to instance of Nigthmare object
  fill(row){
    if(row){
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          const element = row[key];
          this[key] = element;
          if(!this.fillable.includes(key) && key !== 'created_at' && key !== 'updated_at' && key !== 'id'){
            this.fillable.push(key);
          }
        }
      }
      return this;
    } else { throw new Error('fill method, row data is undefined') }
  }
  // returns only the properties or attributes that contain instance data
  toJson(...attr){
    let jsonData = {};
    if(attr.length === 0){
      for (const key in this) {
        if (this.hasOwnProperty(key)) {
          const element = this[key];
          if(this.fillable.includes(key)){
            jsonData[key] = element;
          }
        }
      }
    } else{
      for (const key in this) {
        if (this.hasOwnProperty(key)) {
          const element = this[key];
          if(attr.includes(key)){
            jsonData[key] = element;
          }
        }
      }
    }
    return jsonData;
  }
  static isInstanceOfNightmare(childClass){
    try {
      new childClass() instanceof Nightmare;
    } catch (error) {
      throw new Error("Nightmare Error: METHODS OF RELATIONS need a Nightmare instance");
    }
  }
  //Find by id (standart primary key)
  find(id){
    return new Promise((resolve, reject) => {
      this.pool.query(`SELECT * FROM ${this.table} WHERE id=${id} LIMIT 1`)
      .then( res =>{
        if(!res.rows[0]){
          resolve(undefined);
        }
        this.fill(res.rows[0]);
        resolve(this);
      })
      .catch(err => reject(err));
    })
  }

  //Insert data Object in database
  insert(){
    let variableValues = this.fillable.map((row, i) => {
      return  `$${i + 1}`;
    }).toString();
    let values = this.fillable.map((row) => this[row]);
    let query=`INSERT INTO ${this.table} (${this.fillable.toString()}) VALUES(${variableValues}) RETURNING *`;
    return new Promise((resolve, reject) => {
      this.pool.query(query, values)
      .then(res => {
        if(!res.rows[0]){
          resolve(undefined);
        }
        this.fill(res.rows[0]);
        resolve(this)
      })
      .catch(err => reject(err));
    });
  }

  //update data Object in database
  update(){
    let variableValues = this.fillable.map((row, i) => {
      return  `$${i + 1}`;
    }).toString();
    let values = this.fillable.map((row) => this[row]);
    let query = `UPDATE ${this.table} SET (${this.fillable.toString()}) = (${variableValues}) WHERE id=${this.id} RETURNING *`;
    return new Promise((resolve, reject) => {
      this.pool.query(query, values)
      .then(res => {
        if(!res.rows[0]){
          resolve(undefined);
        }
        this.fill(res.rows[0]);
        resolve(this)
      })
      .catch(err => reject(err));
    });
  }

  //Save Execute Insert Or Update depending of the objebct data
  save(){
    if(this.fillable instanceof Array && this.fillable.length) {
      if(this.id && typeof this.id !== 'undefined'){
        return this.update();
      } else {
        return this.insert();
      }
    } else {
      throw new Error('Nightmare: The fillable attributes are not defined');
    }
  }

  execute(returnIntance = false){
    return new Promise((resolve, reject) => {
      super.execute()
      .then(data => {
        if(!data || data.length === 0) {
          resolve(undefined);
        } else if (data instanceof Array && returnIntance) {
            resolve(data.map(el => {
            return new Nightmare(this.pool, this.table, el);
          }));
        } else if(returnIntance) {
          resolve(new Nightmare(this.pool, this.table, data));
        }
        resolve(data);
      })
      .catch(err => reject(err));
    });
  }


  // ------   RELATIONSSHIPS METHODS   ------
  //ONE TO ONE
  hasOne(relatedClass = Object,  localKey = '', foreignKey = '', returnIntance = false){
    Nightmare.isInstanceOfNightmare(relatedClass);
    const relatedTable = new relatedClass().table;
    return new Promise( (resolve, reject) => {
      this.pool.query(
        `SELECT ${relatedTable}.* FROM ${relatedTable}
          JOIN ${this.table} ON ${this.table}.${localKey}=${relatedTable}.${foreignKey}
          WHERE ${this.table}.${localKey}=${this[localKey]}
          LIMIT 1
      `).then((data) => {
        if(returnIntance){
          resolve(new relatedClass(data.rows[0]));
        } else { 
          resolve(data.rows[0])
        }
      }).catch((err) => reject(err));
    });
  }

  //ONE TO MANY
  hasMany(relatedClass = Object,  localKey, foreignKey, sort = 'ASC', returnIntance = false){
    Nightmare.isInstanceOfNightmare(relatedClass);
    const relatedTable = new relatedClass().table;
    return new Promise((resolve, reject) => {
      this.pool.query(
        `SELECT ${relatedTable}.* FROM ${relatedTable}
            JOIN ${this.table} ON ${this.table}.${localKey}=${relatedTable}.${foreignKey}
            WHERE ${this.table}.${localKey}=${this[localKey]}
          ORDER BY ${relatedTable}.id ${sort.toUpperCase()}`
      ).then((data) => {
        if(returnIntance){
          resolve(data.rows.map(el => new relatedClass(el)));
        } else {
          resolve(data.rows);
        }
      }).catch((err => reject(err)));
    });
  }

  //Defining The Inverse Of The Relationship
  belongsTo(relatedClass = Object,  localKey = '', foreignKey = '', returnIntance = false){
    Nightmare.isInstanceOfNightmare(relatedClass);
    const relatedTable = new relatedClass().table;
    let query = `SELECT * FROM ${relatedTable} WHERE ${foreignKey}=${this[localKey]} LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.pool.query(query).then((data) => {
        if(returnIntance) resolve(new relatedClass(data.rows[0]));
        resolve(data.rows[0]);
      }).catch((err) => reject(err));
    });
  }

  // MANY TO MANY
  async belongsToMany(
    relatedClass = Object, pivotTable, 
    keys = {
      localPrimaryKey:'', pivotOwnerKey:'', pivotRelationalKey:'', foreignPrimaryKey:'',
    }, 
    sort = 'ASC', 
    returnIntance = false
  ){
    let { localPrimaryKey, pivotOwnerKey, pivotRelationalKey, foreignPrimaryKey } = keys;

    localPrimaryKey = (localPrimaryKey) ? localPrimaryKey : 'id' ;
    foreignPrimaryKey = (foreignPrimaryKey) ? foreignPrimaryKey : 'id' ;

    Nightmare.isInstanceOfNightmare(relatedClass);
    const relatedTable = new relatedClass().table;

    let query = {
      text: `SELECT ${relatedTable}.* FROM ${relatedTable}
              JOIN ${pivotTable} ON  (${pivotTable}.${pivotRelationalKey}=${relatedTable}.${foreignPrimaryKey})
              JOIN ${this.table} ON (${pivotTable}.${pivotOwnerKey}=${this.table}.${localPrimaryKey})
              WHERE ${this.table}.${localPrimaryKey}=$1
            ORDER BY ${relatedTable}.${localPrimaryKey} ${sort.toUpperCase()}`,
      values: [this[localPrimaryKey]]
    };
    return new Promise((resolve, reject) => {
      this.pool.query(query).then((data) => {
        if(returnIntance) {
          resolve(data.rows.map(el => new relatedClass(el)));
        } else {
          resolve(data.rows);
        }
      }).catch((err) => reject(err));
    });
  }
} 

module.exports = Nightmare;
