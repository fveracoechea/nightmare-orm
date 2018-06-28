'use strict';
const QueryBuilder = require('./QueryBuilder');

class Nightmare extends QueryBuilder{
  constructor(pool, table, data = false){
    if(!pool) throw new Error('Nightmare Constructor "pool" is undefined');
    if(!table) throw new Error('Nightmare Constructor "table" is undefined');
    super(pool, table);
    this.pool = pool;
    this.table = table;
    this.attributes = [];
    if(data && typeof data === 'object') this.fill(data);
  }
  //fill json data to instance of Nigthmare object
  fill(row){
    if(row){
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          const element = row[key];
          this[key] = element;
          if(!this.attributes.includes(key)){
            this.attributes.push(key);
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
          if(this.attributes.includes(key)){
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
    return new Promise(resolve => {
      this.pool.query(`SELECT * FROM ${this.table} WHERE id=${id} LIMIT 1`)
      .then( res =>{
        this.fill(res.rows[0]);
        resolve(this);
      })
      .catch(err => { throw err });
    })
  }
  //
  attributesValuesToSring(){
    if(this.attributes !== [] && this.attributes.length !== 0){
      if(this.attributes.length == 1){
        return QueryBuilder.prepare(this[this.attributes[0]]);
      } 
      return this.attributes.reduce((prev, current, i, array)=>{
        let separator = (i > array.length) ? '' : ',';
        return (i === 1) 
          ? `${QueryBuilder.prepare(this[prev])}${separator}${QueryBuilder.prepare(this[current])}` 
          : `${prev}${separator}${QueryBuilder.prepare(this[current])}`;
      });
    } else { throw new Error('attributes are not defined!') }
  }
  //Insert data Object in database
  insert(){
    let query=`INSERT INTO ${this.table} (${this.attributes.toString().replace('id,','')}) VALUES(${this.attributesValuesToSring()}) RETURNING *`;
    return new Promise(resolve => {
      this.pool.query(query)
      .then(res => {
        this.fill(res.rows[0]);
        resolve(this)
      })
      .catch(err => {throw err});
    });
  }

  //update data Object in database
  update(){
    let query = `UPDATE ${this.table} SET (${this.attributes.toString().replace('id,','')}) = (${this.attributesValuesToSring()}) WHERE id=${this.id} RETURNING *`;
    return new Promise(resolve => {
      this.pool.query(query)
      .then(res => {
        this.fill(res.rows[0]);
        resolve(this)
      })
      .catch(err => {throw err});
    });
  }

  //Save Execute Insert Or Update depending of the objebct data
  save(){
    if(this.id && typeof this.id !== 'undefined' && this.attributes !== []){
      return this.update();
    } else {
      return this.insert();
    }
  }

  async execute(returnIntance = false){
    let data = await super.execute()
    if(data instanceof Array){
      if(returnIntance){
        return data.map(el => {
          return new Nightmare(this.pool, this.table, el);
        })
      }
    } else {
      if(returnIntance) return new Nightmare(this.pool, this.table, data);
    }
    return data;
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
    if(relatedClass && Nightmare.isInstanceOfNightmare(relatedClass)) return (data.rowCount) ? new relatedClass(data.rows[0]): false;
    else return (data.rowCount) ? data.rows[0] : false;
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
    if(relatedClass && Nightmare.isInstanceOfNightmare(relatedClass)) return (data.rowCount) ? data.rows.map(el => new relatedClass(el)): false;
    else return (data.rowCount) ? data.rows : false;
  }
} 

module.exports = Nightmare;

