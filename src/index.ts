/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Template {
	id: String,
	template: String,
	delete_key: String | null,
	delete_by: number | null,
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url)
		const path = url.pathname.split('/');
		console.log(url.pathname)
		if(path[1] == 'template') {
			switch(request.method) {
				case 'GET': {
					if(path[2] == undefined) return new Response('/template/<id>',{'status':400});
					const id = path[2];
					const template = await getTemplate(env,id);
					if(template == null) return new Response('404',{'status':404});
					return new Response(`${(template.template)}`)
				}
				case 'POST': {

				}
				case 'DELETE': {
					if(path[2] == undefined) return new Response('/template/<id>',{'status':400});
					const id = path[2];
					const template = await getTemplate(env,id);
					if(template == null) return new Response('404',{'status':404});
					if(template.delete_key == null) return new Response('403',{'status':403});
					if(url.searchParams.get('key') != template.delete_key) return new Response('401',{'status':401});
					deleteTemplate(env,id);
					return new Response('200 OK\nDeleted.',{'status':200});
				}
			}
		}
		else {
			return new Response('404',{'status':404});
		}
		console.log(request.method)
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;

async function getTemplate(env: Env, id: string) {
	return await env.DB.prepare('SELECT * FROM templates WHERE (id == ?)').bind(id).first<Template>();
}

async function deleteTemplate(env: Env, id: string) {
	return await env.DB.prepare('DELETE FROM templates where (id == ?)').bind(id).run();
}