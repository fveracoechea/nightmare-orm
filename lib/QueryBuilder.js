const SELECT = 'SELECT';  // 1
const COUNT = 'COUNT';    // 2
const WHERE = 'WHERE';    // 3
const JOIN = 'JOIN';      // 4
const LIMIT = 'LIMIT';
const OFFSET = 'OFFSET';
const DELETE = 'DELETE';
const ORDERBY = 'ORDERBY';
const PAGINATION = 'PAGINATION';

const actionsTypes = {
  SELECT:              'TRUE_FALSE_FALSE_FALSE',// 1
  COUNT:               'FALSE_TRUE_FALSE_FALSE',// 2
  WHERE:               'FALSE_FALSE_TRUE_FALSE', // 3
  LIMIT:               LIMIT,
  OFFSET:              OFFSET,
  SELECT_WHERE:        'TRUE_FALSE_TRUE_FALSE',
  SELECT_JOIN:         'TRUE_FALSE_FALSE_TRUE',
  COUNT_WHERE:         'FALSE_TRUE_TRUE_FALSE',
  SELECT_JOIN_WHERE:   'TRUE_FALSE_TRUE_TRUE'
}

class QueryBuilder {
  constructor(pool, table){
    if(!pool) throw new Error('Nightmare Constructor "pool" is undefined');
    if(!table) throw new Error('Nightmare Constructor "table" is undefined');
    this.columns = [];
    this.operators = [];
    this.selectedColumns = ['*'];
    this.query = '';
    this.queryType = [];
    this.selectedCount = '';
    this.limitNum = 'NULL';
    this.offsetNum = 0;
    this.values = [];
    this.order = {column: 'id', sort: 'ASC'};
    this.pool = pool;
    this.table = table;
    this.joins = [];
  }
  where(column, value, operator = '='){
    if( typeof column === 'undefined' || typeof value === 'undefined') throw new Error("Nightmare Query Builder undefined parameters in the 'where' method");
    this.columns.push(column);
    this.values.push(value);
    this.operators.push(operator);
    this.queryType.push(WHERE);
    return this;
  }

  join(table, on, equal, operator = '='){
    this.queryType.push(JOIN);
    this.joins.push(`JOIN ${table} ON (${on}${operator}${equal})`);
    return this;
  }

  select(...args){
    if(args.length == 0) throw new Error("Nightmare Query Builder undefined args select method");
    this.selectedColumns = args;
    this.queryType.push(SELECT);
    return this;
  }
  limit(num){
    this.queryType.push(LIMIT);
    this.limitNum = num;
    return this;
  }
  offset(num){
    this.queryType.push(OFFSET);
    this.offsetNum = num;
    return this;
  }
  delete(){
    return new Promise((resolve, reject) => {
      if(!this.queryType.includes(WHERE)) {
        if(this.id && typeof this.id !== 'undefined'){
          this.pool.query(`DELETE FROM ${this.table} WHERE id= $1`, [this.id]).then((result) => {
            this.resetAttrs();
            resolve(result.rowCount);
          }).catch((err) =>  reject(err));
        } else { throw new Error("Nightmare Query id is undefined") }
      } else {
        this.pool.query(`DELETE FROM ${this.table} WHERE ${this.prepareKeysAndValues()}`, this.values).then((result) => {
          this.resetAttrs();
          resolve(result.rowCount);
        }).catch((err) =>  reject(err));
      }
    });
  }

  validateArgs(){
    if(this.columns.length == 0 && this.queryType.includes(WHERE)) throw new Error("Nightmare Query Builder undefined columns");
    if(this.queryType == '') throw new Error("Nightmare Query Builder undefined query");
    if(this.queryType.includes(WHERE) && this.values.length == 0) throw new Error("Nightmare Query Builder undefined values");
  }
  prepareKeysAndValues(){
    if(this.values.length === 1 && this.columns.length === 1){
      return `${this.columns[0]}${this.operators[0]}$1`;
    } else {
      return this.columns.reduce((prev, current, i, array)=>{
        let separator = (i > array.length) ? '' : 'AND';
        return (i === 1) 
          ? `${prev}${this.operators[0]}$${i} ${separator} ${current}${this.operators[i]}$${i + 1}`
          : `${prev} ${separator} ${current}${this.operators[i]}$${i + 1}`;
      });
    }
  }

  count(rowName = '*'){
    this.queryType.push(COUNT); 
    this.selectedCount = rowName;
    return this;
  }

  orderBy(column, sort = 'ASC'){
    this.queryType.push(ORDERBY);
    this.order = {column, sort: sort.toUpperCase()}
    return this;
  }
  
  joinReducer(){
    return this.joins.reduce((prevValue, nextValue) => `${prevValue} ${nextValue}`);
  }


  queryReducer(){                   
    let where = this.queryType.includes(WHERE), select = this.queryType.includes(SELECT), 
    count = this.queryType.includes(COUNT), join = this.queryType.includes(JOIN),
    //             1        2         3       4
    result = `${select}_${count}_${where}_${join}`.toUpperCase();
    switch (result) {
      case actionsTypes.SELECT:
        this.query = `SELECT ${this.selectedColumns.toString()} FROM ${this.table}`;
        return this;
      case actionsTypes.COUNT:
        this.query = `SELECT COUNT(${this.selectedCount}) FROM ${this.table}`;
        return this;
      case actionsTypes.WHERE:
        this.query = `SELECT * FROM ${this.table} WHERE ${this.prepareKeysAndValues()}`;
        return this;
      case actionsTypes.SELECT_WHERE:
        this.query = `SELECT ${this.selectedColumns.toString()} FROM ${this.table} WHERE ${this.prepareKeysAndValues()}`;
        return this;
      case actionsTypes.COUNT_WHERE:
        this.query = `SELECT COUNT(${this.selectedCount}) FROM ${this.table} WHERE ${this.prepareKeysAndValues()}`;
        return this;
      case actionsTypes.SELECT_JOIN:
        this.query = `SELECT ${this.selectedColumns.toString()} FROM ${this.table} ${this.joinReducer()}`;
        return this;
      case actionsTypes.SELECT_JOIN_WHERE:
        this.query = `SELECT ${this.selectedColumns.toString()} FROM ${this.table} ${this.joinReducer()} WHERE ${this.prepareKeysAndValues()}`;
        return this;
      default:
      console.log(result, actionsTypes.SELECT_WHERE)
        throw new Error('Nightmare Query invalid arguments or sequencing of erroneous methods');
    }
  }

  setOrder(){
    this.query = this.query + ` ORDER BY ${this.order.column} ${this.order.sort}`;
    return this;
  }
  setLimit(){
    this.query = this.query + ` LIMIT ${this.limitNum}`;
    return this;
  }
  setOffset(){
    this.query = this.query + ` OFFSET ${this.offsetNum}`;
    return this;
  }

  resetAttrs(){
    this.columns = [];
    this.selectedColumns = ['*'];
    this.query = '';
    this.queryType = [];
    this.values = [];
    this.order = {column: 'id', sort: 'DESC'};
    this.selectedCount = '';
    this.limitNum = 'NULL';
    this.offsetNum = 0;
  }

  execute(){
    this.validateArgs();
    this.queryReducer();
    if(this.queryType.includes(ORDERBY)){
      this.setOrder();
    }
    if( (!this.queryType.includes(COUNT) && !this.queryType.includes(DELETE)) &&
        (this.queryType.includes(LIMIT) || this.queryType.includes(OFFSET)) ){
      this.setLimit().setOffset();
    }
    const query = (this.values.length) 
      ? { text: this.query, values: this.values } : this.query;
    this.resetAttrs();
    return new Promise((resolve, reject) => {
      this.pool.query(query)
      .then(res => {
        if (res.rowCount > 1){
          resolve(res.rows);
        } else if(res.rowCount == 1) {
          resolve(res.rows[0]);
        } else resolve(false);
      })
      .catch(err => reject(err));
    })
  }
}

module.exports = QueryBuilder;
