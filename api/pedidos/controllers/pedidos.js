'use strict';
require('dotenv').config()
const mercadopago = require ('mercadopago');
const axios = require('axios');

mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_PRIVATE_KEY
});

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
    async create(ctx) {

        // Initial verifications
        if (ctx.is('multipart')) {
            return {
                status: 406,
                message: "Multipart not accepted"
            }
        }
        if(!(ctx.request.body.dados_do_pedido && ctx.request.body.endereco_de_entrega && ctx.request.body.opcao_de_frete)) {
            return {
                status: 406,
                message: "Preference incomplete"
            }
        }

        // Fetch freight data
        const dados_do_pedido = await Promise.all(ctx.request.body.dados_do_pedido.map(async (line) => {
            const data = await strapi.query('pecas').findOne({ id: line.id })
            return {
                ...line,
                titulo: data.titulo,
                preco_promocional: data.preco_promocional,
                preco_em_centavos: data.preco_em_centavos,
                altura: data.altura_da_embalagem_em_cm,
                largura: data.largura_da_embalagem_em_cm,
                comprimento: data.comprimento_da_embalagem_em_cm,
                peso: data.peso_em_kg
            }
        }))

        const freight_data = dados_do_pedido.reduce((acum, curr) => ({
            weight: acum.weight + curr.peso,
            width: (acum.width > curr.largura) ? acum.width : curr.largura,
            length: (acum.length > curr.comprimento) ? acum.length : curr.comprimento,
            height: acum.height + curr.altura,
            insurance_value: acum.insurance_value + ((curr.preco_promocional) ? curr.preco_promocional : curr.preco_em_centavos) / 100
        }), {weight: 0, width: 0, height: 0, length: 0, insurance_value: 0})

        const config = {
            method: 'post',
            url: `${process.env.MELHOR_ENVIO_URL}/api/v2/me/shipment/calculate`,
            headers: { 
              'Accept': 'application/json', 
              'Content-Type': 'application/json', 
              "Authorization": `Bearer ${process.env.PRIVATE_TOKEN}`,
              'User-Agent': `email ${process.env.EMAIL}`, 
            },
            data: {
                from: { postal_code: process.env.SENDER_CEP },
                to: { postal_code: ctx.request.body.endereco_de_entrega.cep },
                "package": freight_data
            }
        };
        const freightOptions = await axios(config)
        const chosenFreight = freightOptions.data.find(freight => freight.name === ctx.request.body.opcao_de_frete)

        // Query the cartItems
        let preference = {
            items: dados_do_pedido.map(line => ({
                title: `${line.titulo} na cor ${line.cor} tamanho ${line.tamanho}`,
                unit_price: (Number(line.preco_promocional ? line.preco_promocional : line.preco_em_centavos)/100),
                quantity: 1
            })),
        }
        preference.items.push({
            title: 'Frete',
            unit_price: Number(chosenFreight.price),
            quantity: 1
        })

        const res = await mercadopago.preferences.create(preference)

        return JSON.stringify({PaymentLink: res.body.init_point})
      },
};
