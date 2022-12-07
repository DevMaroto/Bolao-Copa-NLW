import { FastifyRequest } from "fastify";

export async function authenticate(Request: FastifyRequest) {
  await Request.jwtVerify()
}