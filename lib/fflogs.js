const reqp = require('request-promise-native');

let token;

module.exports = {
	updateAccessToken: () => {
		const options = {
			url: 'https://ja.fflogs.com/oauth/token',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: 'grant_type=client_credentials',
			auth: {
				'user': process.env.FFLOGS_CLIENT,
				'pass': process.env.FFLOGS_SECRET
			}
		};
		return new Promise((resolve, reject) => {
			reqp(options).then((result)=>{
				console.log('updateFFlogsBearer - result', result);
				token = JSON.parse(result).access_token;
				return resolve();
			}).catch((error) => {
				console.log('error', error);
				return reject();
			});
		});
	},
	getAccessToken: () => {
		return token;
	}
}
