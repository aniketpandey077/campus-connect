/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://unihood.online',
  generateRobotsTxt: true,
  exclude: ['/api/*', '/chat/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api', '/chat'],
      },
    ],
  },
};
