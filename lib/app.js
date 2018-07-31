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
    if(data && typeof data === 'object') this.fill(data);
  }
  //fill json data to instance of Nigthmare object
  fill(row){
    if(row){
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          const element = row[key];
          this[key] = element;
          if(!this.fillable.includes(key) && key !== 'created_at' && key !== 'updated_at'){
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
    return  new childClass() instanceof Nightmare;
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
  //
  attributesValuesToSring(){
    if(this.fillable !== [] && this.fillable.length !== 0){
      if(this.fillable.length == 1){
        return QueryBuilder.prepare(this[this.fillable[0]]);
      } 
      return this.fillable.reduce((prev, current, i, array)=>{
        let separator = (i > array.length) ? '' : ',';
        return (i === 1) 
          ? `${QueryBuilder.prepare(this[prev])}${separator}${QueryBuilder.prepare(this[current])}` 
          : `${prev}${separator}${QueryBuilder.prepare(this[current])}`;
      });
    } else { throw new Error('attributes are not defined!') }
  }
  //Insert data Object in database
  insert(){
    let query=`INSERT INTO ${this.table} (${this.fillable.toString().replace('id,','')}) VALUES(${this.attributesValuesToSring()}) RETURNING *`;
    return new Promise((resolve, reject) => {
      this.pool.query(query)
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
    let query = `UPDATE ${this.table} SET (${this.fillable.toString().replace('id,','')}) = (${this.attributesValuesToSring()}) WHERE id=${this.id} RETURNING *`;
    return new Promise((resolve, reject) => {
      this.pool.query(query)
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
    if(this.id && typeof this.id !== 'undefined' && this.fillable !== []){
      return this.update();
    } else {
      return this.insert();
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
  async hasOne(relatedClass = Nightmare,  localKey = '', foreignKey = '', relatedTable = ''){
    let query = 
    `SELECT ${relatedTable}* FROM ${relatedTable}
      JOIN ${this.table} ON ${this.table}.${localKey}=${relatedTable}.${foreignKey}
      WHERE ${this.table}.${localKey}=${QueryBuilder.prepare(this[localKey])}
      LIMIT 1`;
    let data = await this.pool.query(query);
    if(relatedClass && Nightmare.isInstanceOfNightmare(relatedClass)){
      return new relatedClass(data.rows[0]);
    } else { return data.rows[0] }
  }

  //ONE TO MANY
  async hasMany(relatedClass = Nightmare,  localKey = '', foreignKey = '', relatedTable = '', sort = 'ASC'){
    let query = 
    `SELECT ${relatedTable}.* FROM ${relatedTable}
      JOIN ${this.table} ON ${this.table}.${localKey}=${relatedTable}.${foreignKey}
      WHERE ${this.table}.${localKey}=${QueryBuilder.prepare(this[localKey])}
    ORDER BY ${relatedTable}.id ${sort.toUpperCase()}`;
    let data = await this.pool.query(query);
    if(relatedClass && Nightmare.isInstanceOfNightmare(relatedClass)){
      return data.rows.map(el => new relatedClass(el));
    } else {
      return data.rows;
    }
  }

  //Defining The Inverse Of The Relationship
  async belongsTo(relatedClass = Nightmare,  localKey = '', foreignKey = '', relatedTable = ''){
    let query = `SELECT * FROM ${relatedTable} WHERE ${foreignKey}=${QueryBuilder.prepare(this[localKey])} LIMIT 1`;
    let data = await this.pool.query(query);
    if(relatedClass && Nightmare.isInstanceOfNightmare(relatedClass)) return (data.rowCount) ? new relatedClass(data.rows[0]): undefined;
    else return (data.rowCount) ? data.rows[0] : undefined;
  }

  // MANY TO MANY
  async belongsToMany(relatedClass = Nightmare, pivotTable = '', relatedTable = '', foreignKey = '', otherKey = '', sort = 'ASC'){
    let query = `SELECT ${relatedTable}.* FROM ${relatedTable}
                  JOIN ${pivotTable} ON  (${pivotTable}.${otherKey}=${relatedTable}.id)
                  JOIN ${this.table} ON (${pivotTable}.${foreignKey}=${this.table}.id)
                  WHERE ${this.table}.id=${QueryBuilder.prepare(this.id)}
                ORDER BY ${relatedTable}.id ${sort.toUpperCase()}`;
    // console.log(query)
    let data = await this.pool.query(query)
    if(relatedClass && Nightmare.isInstanceOfNightmare(relatedClass)) return (data.rowCount) ? data.rows.map(el => new relatedClass(el)): undefined;
    else return (data.rowCount) ? data.rows : undefined;
  }
} 

module.exports = Nightmare;
