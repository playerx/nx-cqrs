export type JokerServerMessage =
  | {
      type: 'Joker.PlayerOnline'
    }
  | {
      type: 'Joker.PlayerOffline'
    }
  | {
      type: 'Joker.JoinRoom'
      roomId: string
    }
  | {
      type: 'Joker.ClientLeave'
    }
  | {
      type: 'Joker.SendMessage'
      message: string
    }
  | {
      type: 'Joker.SelectPosition'
      position: number
    }
  | {
      type: 'Joker.SelectWant'
      want: number
    }
  | {
      type: 'Joker.SelectKozir'
      color: number
    }
  | {
      type: 'Joker.SelectCard'
      card: any // Card
      isActivated: boolean
      specialColor?: any // CardColor
    }
  | {
      type: 'Joker.BackInGame'
    }
  | {
      type: 'Joker.Respect'
      targetUserId: string
    }
  | {
      type: 'Joker.Buzz'
      targetUserId: string
    }
  | {
      type: 'Joker.SendGift'
      targetUserId: string
      giftBoxCode: string
      giftBoxColor: string
    }
  | {
      type: 'Joker.SendInteraction'
      interaction:
        | {
            type: 'RESPECT'
            targetUserId: string
          }
        | {
            type: 'BUZZ'
            targetUserId: string
          }
        | {
            type: 'SEND_GIFT'
            targetUserId: string
            giftBoxCode: string
            giftBoxColor: string
          }
    }
  | {
      type: 'Joker.SendEmotion'
      code: string
      toUserId?: string
    }
