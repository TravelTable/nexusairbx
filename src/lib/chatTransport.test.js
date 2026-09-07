import { TextDecoder, TextEncoder } from "util";
import { readAskEventStream, readAskResponse } from "./chatTransport";
global.TextDecoder = TextDecoder;
function body(chunks) { let index=0; return {getReader:()=>({read:async()=> index<chunks.length?{value:new TextEncoder().encode(chunks[index++]),done:false}:{done:true},cancel:jest.fn(),releaseLock:jest.fn()})}; }
const frame=event=>`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
const stop={type:"terminal",status:"completed",complete:true,finishReason:"stop"};
test("SSE parser preserves newlines, Unicode and chunks split across event boundaries", async () => {
 const text='local x = {}\nreturn "🎮"'; const raw=frame({type:"delta",text})+frame(stop); const onText=jest.fn();
 await expect(readAskEventStream(body([raw.slice(0,17),raw.slice(17,41),raw.slice(41)]),{onText})).resolves.toBe(text);
 expect(onText).toHaveBeenLastCalledWith(text);
});
test("EOF without model terminal remains incomplete and preserves partial output", async () => {
 await expect(readAskEventStream(body([frame({type:"delta",text:"Half a sentence"})]))).rejects.toMatchObject({code:"CHAT_INCOMPLETE",partial:"Half a sentence"});
});
test("output limit terminal cannot report success", async () => {
 await expect(readAskEventStream(body([frame({type:"delta",text:"Half"}),frame({type:"terminal",status:"incomplete",complete:false,code:"CHAT_OUTPUT_LIMIT"})]))).rejects.toMatchObject({code:"CHAT_OUTPUT_LIMIT",partial:"Half"});
});
test("malformed events do not become chat text", async () => {
 await expect(readAskEventStream(body(['data: {bad}\n\n']))).rejects.toMatchObject({code:"INVALID_STREAM_EVENT"});
});
test("empty stop is not a successful answer", async () => {
 await expect(readAskEventStream(body([frame(stop)]))).rejects.toMatchObject({code:"CHAT_EMPTY"});
});
test("plain transport requires durable completion and does not trust EOF", async () => {
 await expect(readAskResponse({ok:true,status:200,headers:{get:()=>"text/plain"},body:body(["Partial"])})).rejects.toMatchObject({code:"CHAT_INCOMPLETE",partial:"Partial"});
});
test("saved completed Ask operation replays its text", async () => {
 const response={ok:true,status:202,json:async()=>({operation:{operationId:"o1",status:"completed",result:{body:"Saved answer"}}})};
 await expect(readAskResponse(response,{readOperation:jest.fn()})).resolves.toBe("Saved answer");
});

test("SSE operation recovery uses saved text, never transport frames", async () => {
 const response={ok:true,status:202,json:async()=>({operation:{operationId:"o1",status:"completed",result:{body:frame({type:"delta",text:"Saved"})+frame(stop),text:"Saved",contentType:"text/event-stream; charset=utf-8",terminal:stop}}})};
 await expect(readAskResponse(response,{readOperation:jest.fn()})).resolves.toBe("Saved");
});
test("failed operation recovery preserves its partial answer", async () => {
 const response={ok:true,status:202,json:async()=>({operation:{operationId:"o1",status:"failed",error:{code:"CHAT_OUTPUT_LIMIT"},result:{text:"Half",terminal:{complete:false}}}})};
 await expect(readAskResponse(response,{readOperation:jest.fn()})).rejects.toMatchObject({code:"CHAT_OUTPUT_LIMIT",partial:"Half"});
});
