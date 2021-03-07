'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
    async create(ctx) {

        if (ctx.is('multipart')) {
            return {
                status: 406,
                message: "Multipart not accepted"
            }
        }

        //let entity = await strapi.services.pedidos.create(ctx.request.body);
        // return sanitizeEntity(entity, { model: strapi.models.pedidos });

        console.log(ctx.request.body)
        return 'DEU BOM'
      },
};
