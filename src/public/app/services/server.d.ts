declare module 'server';


export async function post(url:string, data?:string | {}, componentId?:string | number): Promise;
export async function get(url:string, componentId?:string | number): Promise;

export interface server_response{
    message: string
}