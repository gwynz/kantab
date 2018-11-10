"use strict";

const { runHttpQuery, convertNodeHttpToRequest } = require("apollo-server-core");
const url = require("url");

// Utility function used to set multiple headers on a response object.
function setHeaders(res, headers) {
	Object.keys(headers).forEach(header => res.setHeader(header, headers[header]));
}

// Build and return an async function that passes incoming GraphQL requests
// over to Apollo Server for processing, then fires the results/response back
// using Micro's `send` functionality.
module.exports = function graphqlMoleculer(options) {
	if (!options) {
		throw new Error("Apollo Server requires options.");
	}

	if (arguments.length > 1) {
		throw new Error(
			`Apollo Server expects exactly one argument, got ${arguments.length}`,
		);
	}

	return async function graphqlHandler(req, res) {
		let query;
		try {
			if (req.method === "POST")
				query = req.filePayload || req.body;
			else
				query = url.parse(req.url, true).query;
		} catch (error) {
			// Do nothing; `query` stays `undefined`
		}

		try {
			const { graphqlResponse, responseInit } = await runHttpQuery([req, res], {
				method: req.method,
				options,
				query,
				request: convertNodeHttpToRequest(req),
			});

			setHeaders(res, responseInit.headers);

			return graphqlResponse;
		} catch (error) {
			if ("HttpQueryError" === error.name && error.headers) {
				setHeaders(res, error.headers);
			}

			if (!error.statusCode) {
				error.statusCode = 500;
			}

			res.statusCode = error.statusCode;
			res.end(error.message);

			return undefined;
		}
	};
};