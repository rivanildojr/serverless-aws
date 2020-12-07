'use strict';

const settings = require("./config/settings")

const axios = require("axios");
const cheerio = require("cheerio");
const uuid = require("uuid");

class Handler {

  constructor({dynamoDbSvc}) {
    this.dynamoDbSvc = dynamoDbSvc
  }

  prepareDate(data) {
    const params = {
      TableName: settings.dbTableName,
      Item: {
        commitMessage: data,
        id: uuid.v1(),
        createdAt: new Date().toISOString()
      } 
    }

    return params;
  }

  async insertItem(params) {
    return this.dynamoDbSvc.put(params).promise();
  }

  static async main(event){
    try {
      console.log("at", new Date().toISOString, JSON.stringify(event, null, 2))
      const {data} = await axios.get(settings.commitMessageUrl)
      console.log("data", data);

      const $ = cheerio.load(data);
      const [commitMessage] = await $("#content").text().trim().split("\n");
      console.log("commitMessage", commitMessage);

      const params = this.prepareDate(commitMessage);
      console.log("params", params);

      await this.insertItem(params);
      console.log("Finalizada a operação");

      return {
        statusCode: 200
      }
      
    } catch (error) {
      console.log("Error***", error.stack);
      return {
        statusCode: 500
      }
    }
    
  }
}

//factory
const aws = require("aws-sdk");
const dynamoDB = new aws.DynamoDB.DocumentClient();

const handler = new Handler({
  dynamoDbSvc: dynamoDB
})

module.exports = {
  scheduler: Handler.main.bind(handler)
}
