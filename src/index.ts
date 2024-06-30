import { Buffer } from 'node:buffer'
import { Inflate, inflate } from 'pako'

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

const headers = {
	'Access-Control-Allow-Origin': 'https://dfonline.dev'
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url)
		const path = url.pathname.replace(/^(\/(?=\/))+/,'').split('/');
		if(path[1] == 'template') {
			switch(request.method) {
				case 'GET': {
					if(path[2] == undefined) return new Response('/template/<id>',{'status':400,headers});
					const id = path[2];
					const template = await getTemplate(env,id);
					if(template == null) return new Response('404',{'status':404,headers});
					return new Response(`${(template.template)}`,{headers})
				}
				case 'POST': {
					const data = await request.text();
					const dupe = await dupeCheck(env,data);
					if(dupe != null) return new Response(`${JSON.stringify({'id':dupe.id})}`,{headers:{...headers,'Content-Type':'application/json'}});
					const inflated = inflate(Buffer.from(data,'base64'),{to:'string'});
					try {
						if(!((JSON.parse(inflated).blocks) instanceof Array)) return new Response('400',{'status':400,headers});
					}
					catch {
						return new Response('400',{'status':400,headers});
					}
					const buf = Buffer.alloc(12);
					while (true) {
						crypto.getRandomValues(buf);
						if(await getTemplate(env,buf.toString('base64url')) == null) break;
					}
					const id = buf.toString('base64url');
					const delete_key = crypto.getRandomValues(Buffer.alloc(8)).toString('base64url');
					uploadTemplate(env,data,id,delete_key);
					return new Response(`${JSON.stringify({id,delete_key})}`,{headers:{...headers,'Content-Type':'application/json'}});
				}
				case 'DELETE': {
					if(path[2] == undefined) return new Response('/template/<id>',{'status':400,headers});
					const id = path[2];
					const template = await getTemplate(env,id);
					if(template == null) return new Response('404',{'status':404,headers});
					if(template.delete_key == null) return new Response('403',{'status':403,headers});
					if(url.searchParams.get('key') != template.delete_key) return new Response('401',{'status':401,headers});
					deleteTemplate(env,id);
					return new Response('200 OK\nDeleted.',{'status':200,headers});
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

async function dupeCheck(env: Env, template: string) {
	return await env.DB.prepare('SELECT * FROM templates WHERE (template == ?)').bind(template).first<Template>();
}

async function uploadTemplate(env: Env, template: string, id: string, delete_key: string) {
	return await env.DB.prepare('INSERT INTO templates (id, template, delete_key) VALUES (?, ?, ?)').bind(id,template,delete_key).run();
}

async function deleteTemplate(env: Env, id: string) {
	return await env.DB.prepare('DELETE FROM templates where (id == ?)').bind(id).run();
}