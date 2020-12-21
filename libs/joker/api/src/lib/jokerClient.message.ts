export type JokerClientMessage =
  | {
      type: 'Joker.RoomNotFound'
    }
  | {
      type: 'Joker.RequireAuthorization'
    }
  | {
      type: 'Joker.RegisterSuccess'
    }
  | {
      type: 'Joker.GameWillStart'
      seconds: number
    }
  | {
      type: 'Joker.GameStarting'
    }
  | {
      type: 'Joker.RoundFinished'
    }
  | {
      type: 'Joker.GameFinished'
    }
  | {
      type: 'Joker.CurrentTable'
      info: any
      channel: string
    }
  | {
      type: 'Joker.CurrentTableUsers'
      players: any[]
    }
  | {
      type: 'Joker.TableResetDownCards'

      /**
       * Starts with 1
       */
      playerPosition: number
    }
  | {
      type: 'Joker.TableReset'
    }
  | {
      type: 'Joker.CurrentCards'
      cards: any[] // Card[]
      isNewDeck: boolean
    }
  | {
      type: 'Joker.PlayerSocketId'
      userId: string
      socketId: string | null
    }
  | {
      type: 'Joker.GameCard'

      /**
       * Starts with 1
       */
      playerPosition: number
      card: any // Card
      jokerAction: null | any // JokerSubAction
      isFirstPlayer: boolean
      isNewDeck: boolean
    }
  | {
      type: 'Joker.GameVisualDeal'
      mode: any // VisualDealMode
      cardCount: number
      dealerUserId: string
    }
  | {
      type: 'Joker.GameWantRequest'
      cardCount: number
      wantLimit: number
      autoSelect: number
      fillRequired: number
    }
  | {
      type: 'Joker.GameCardRequest'
      isFirstCard: boolean
    }
  | {
      type: 'Joker.GameKozirRequest'
    }
  | {
      type: 'Joker.GameActivetePlayer'

      /**
       * Starts with 1
       */
      playerPosition: number
    }
  | {
      type: 'Joker.GameDescCardCount'

      /**
       * Starts with 1
       */
      playerPosition: number
    }
  | {
      type: 'Joker.GameSetKozir'
      mode: 'CARD' | 'COLOR'
      card: any // Card
      color: any // CardColor
      isNewDeck: boolean
    }
  | {
      type: 'Joker.GameSetCardsPermission'
      permissionString: string
    }
  | {
      type: 'Joker.GameSetCardsVisible'

      /**
       * Starts with 1
       */
      playerPosition: number

      cardsVisibleString: string
    }
  | {
      type: 'Joker.GamePlayerLeft'

      /**
       * Starts with 1
       */
      playerPosition: number

      isDisconnect: boolean
      messasge: string
    }
  | {
      type: 'Joker.GamePlayerIsBack'

      /**
       * Starts with 1
       */
      playerPosition: number
    }
  | {
      type: 'Joker.GamePlayerIsAFK'

      /**
       * Starts with 1
       */
      playerPosition: number
      userId: string
    }
  | {
      type: 'Joker.PlayerCoeficient'

      /**
       * Starts with 1
       */
      playerPosition: number
      coeficient: number
    }
  | {
      type: 'Joker.GameStatsInfo'
      status: number
      count: number
      message: string
    }
  | {
      type: 'Joker.ResultsPlayer'

      /**
       * Starts with 1
       */
      playerPosition: number
      results: any[]
    }
  | {
      type: 'Joker.ResultsPlayerWant'

      /**
       * Starts with 1
       */
      playerPosition: number
      section: number
      line: number
      want: number
    }
  | {
      type: 'Joker.ResultsUpdatePlayerTaken'

      /**
       * Starts with 1
       */
      playerPosition: number
      have: number
      want: number
    }
  | {
      type: 'Joker.ChatMessage'
      userId: string
      message: string
    }
  | {
      type: 'Joker.ChatBanned'
      banDaysCount: number
    }
  | {
      type: 'Joker.Respect'
      userId: string
      targetUserId: string
    }
  | {
      type: 'Joker.Buzz'
      userId: string
      targetUserId: string
    }
  | {
      type: 'Joker.SendGift'
      userId: string
      targetUserId: string
      giftBoxCode: string
      giftBoxColor: string
    }
  | {
      type: 'Joker.NewInteraction'
      interaction:
        | {
            type: 'RESPECT'
            userId: string
            targetUserId: string
          }
        | {
            type: 'BUZZ'
            userId: string
            targetUserId: string
          }
        | {
            type: 'SEND_GIFT'
            userId: string
            targetUserId: string
            giftBoxCode: string
            giftBoxColor: string
          }
    }
  | {
      type: 'Joker.PlayerInteractions'
      interactions: PlayerInteraction[]
    }
  | {
      type: 'Joker.UserListeningMusic'
      userId: string
      isListening: boolean
      musicChannelId: string
    }
  | {
      type: 'Joker.ShowRatingResult'
      isRatingsEnabled: boolean
      result: any
    }
  | {
      type: 'Joker.EmotionSent'
      code: string
      fromUserId: string
      toUserId?: string
    }
  | {
      type: 'Joker.Close'
    }

export type PlayerInteraction =
  | {
      type: 'RESPECT'
      userId: string
      targetUserId: string
    }
  | {
      type: 'BUZZ'
      userId: string
      targetUserId: string
    }
  | {
      type: 'SEND_GIFT'
      userId: string
      targetUserId: string
      giftBoxCode: string
      giftBoxColor: string
    }

export interface PlayerSentEmotion {
  code: string
  isSpecial: boolean
  fromUserId: string
  toUserId?: string
}
