const uuid = require("uuid");
const joi = require("@hapi/joi");
const decoratorValidator = require("./util/decoratorValidator");
const globalEnum = require("./util/globalEnum");

class Handler {

    constructor({dynamoDbSvc}) {
        this.dynamoDbSvc = dynamoDbSvc;
        this.dynamoDbTable = process.env.DYNAMODB_TABLE;
    }

    static validator() {
        return joi.object({
            nome: Joi.string().max(100).min(2).required(),
            poder: Joi.string().max(20).required()
        })
    }

    async insertItem(params) {
        return this.dynamoDbSvc.put(params).promise();
    }

    prepareData(data) {
        const params = {
            TableName: this.dynamoDbTable,
            Item: {
                ...data,
                id: uuid.v1(),
                createdAt: new Date().toISOString()
            }
        }

        return params;
    }

    handlerSuccess(data) {
        const response = {
            statusCode: 200,
            body: JSON.stringify(data)
        }
        return response;
    }

    handlerError(data) {
        return {
            statusCode: data.statusCode || 501,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Couldn\'t create item!!'
        }
    }

    async main(event) {
        try {
            console.log("Event**", event);

            // agora o decorator modifica o body e já retorna no formato JSON
            const data = event.body;
            console.log("Data**", data);

            const dbParams = this.prepareData(data);
            console.log("dbParams**", dbParams);

            console.log("Inserindo no DynamoDB**");
            await this.insertItem(dbParams);

            console.log("Finalizando Processo**");
            return this.handlerSuccess(dbParams.Item);
            
        } catch (error) {
            console.log("Erro**", error.stack);
            return this.handlerError({ statusCode: 500 });
        }
    }
}

//factory
const AWS = require("aws-sdk");
const Joi = require("@hapi/joi");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const handler = new Handler({
    dynamoDbSvc: dynamoDB
});

module.exports = decoratorValidator(
        handler.main.bind(handler),
        Handler.validator(),
        globalEnum.ARG_TYPE.BODY
    );