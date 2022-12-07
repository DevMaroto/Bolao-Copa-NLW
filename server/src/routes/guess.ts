import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate"

export async function guessRoutes(fastify: FastifyInstance) {
  fastify.get('/guesses/count', async() => {
    const count = await prisma.guess.count()

    return { count }
  })

  fastify.post('/pools/:poolId/games/:gameId/guesses', {
    onRequest: [authenticate]
  }, async (request, replay) => {
    const createGuessParams = z.object({
      poolId: z.string(),
      gameId: z.string(),
    })

    const createGuessBody = z.object({
      firstTeamPoints: z.number(),
      secondTeamPoints: z.number(),
    });

    const { poolId, gameId } = createGuessParams.parse(request.params)
    const { firstTeamPoints, secondTeamPoints} = createGuessBody.parse(request.body)

    const participant = await prisma.participant.findUnique({
      where: {
        userId_poolId: {
          poolId,
          userId: request.user.sub,
        }
      }
    })

    if (!participant) {
      return replay.status(400).send({
        message: "você não tem permissão para criar um palpite dentro deste bolão!"
      })
    }

    const guess = await prisma.guess.findUnique({
      where: {
        participantId_gameId: {
          participantId: participant.id,
          gameId
        }
      }
    })

    if (guess) {
      return replay.status(400).send({
        message: "você já enviou um palpite para este jogo neste bolão!",
      })
    }

    const game = await prisma.game.findUnique({
      where: {
        id: gameId,
      }
    })

    if(!game) {
      return replay.status(400).send({
        message: "Jogo não encontrado!",
      })
    }

    if (game.data > new Date()) {
      return replay.status(400).send({
        message: "Você não pode enviar palpites depois da data do jogo!",
      })
    }

    await prisma.guess.create({
      data: {
        gameId,
        participantId: participant.id,
        firstTeamPoints,
        secondTeamPoints,
      }
    })

    return replay.status(201).send()
  })
}