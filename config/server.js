module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '4c104eb7060541a04d78dc1f29d60cf3'),
    },
    autoOpen: false,
  },
});
