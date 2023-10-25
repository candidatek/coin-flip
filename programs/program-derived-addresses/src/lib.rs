#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
 use num_derive::*;
 
pub mod instructions;
pub mod state;
declare_id!("3XgEAxN3vcg3g6rvXRgnT8o61zhcx611MHKjG4yLfJqm");

// step 1 -> send 1 SOL to PDA
// step 2 -> create odd or even program
// step 3 -> return SOL to user

#[program]
pub mod coin_flip {
    use super::*;
    use anchor_lang::solana_program::{program::invoke, system_instruction::transfer};
 
    pub fn setup(ctx: Context<Setup>, player: Pubkey, bet_amount: u64, vendor_seed: i64) -> Result<()> {
        let coin_flip= &mut ctx.accounts.coin_flip;

        coin_flip.players = [ctx.accounts.vendor.key(), player];
        coin_flip.vendor_seed = vendor_seed;
        coin_flip.bump = *ctx.bumps.get("coin_flip").unwrap();
        coin_flip.bet_amount = bet_amount;  

        invoke( 
            &transfer(
                ctx.accounts.vendor.to_account_info().key,
                coin_flip.to_account_info().key,
                coin_flip.bet_amount,
            ),
            &[
                ctx.accounts.vendor.to_account_info(),
                coin_flip.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

    Ok(()) 
   
}


pub fn play(ctx: Context<Play>, player_choice: u8, player_seed: i64) -> Result<()> {
    let coin_flip = &mut ctx.accounts.coin_flip;
    let player_seed = player_seed;

    let player_side  = if player_choice == 0 {
        Side::Tails
    } else {
        Side::Heads
    };

    invoke(
        &transfer(ctx.accounts.player.to_account_info().key,
         coin_flip.to_account_info().key, coin_flip.bet_amount), 
        
        &[
            ctx.accounts.player.to_account_info(),
            coin_flip.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
        let total_bet = coin_flip.bet_amount * 2;
        let winner = coin_flip.play(player_seed, player_side);

        **coin_flip.to_account_info().try_borrow_mut_lamports()? -= total_bet;

        if winner == *ctx.accounts.vendor.key {
            **ctx.accounts.vendor.try_borrow_mut_lamports()? += total_bet;
        }else {
            **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += total_bet;
        }

    Ok(())
    
}


}

#[account]
#[derive(Default)]
pub struct CoinFlip {
    players: [Pubkey; 2],
    vendor_seed: i64,
    state: CoinFlipState,
    bet_amount: u64,
    bump: u8,
}

#[derive(Accounts)]
pub struct Play<'info> {
    #[account(
        mut, 
        seeds = [b"coin-flip4", vendor.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub coin_flip: Account<'info, CoinFlip>,
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut)]
    pub vendor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(player: Pubkey, bet_amount: u64, vendor_seed: i64)]
pub struct Setup<'info> {
    #[account(
        init,
        payer = vendor,
        space = CoinFlip::LEN,
        seeds = [b"coin-flip4", vendor.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub coin_flip: Account<'info, CoinFlip>,
    #[account(mut)]
    pub vendor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CoinFlipState {
    Active,
    Finished { winner: Pubkey },
}

impl Default for CoinFlipState {
    fn default() -> Self {
        Self::Active
    }
}

#[derive(
    AnchorSerialize, AnchorDeserialize, FromPrimitive, ToPrimitive, Copy, Clone, PartialEq, Eq,
)]
pub enum Side {
    Heads,
    Tails,
}

impl CoinFlip {
    const LEN: usize = 64 + 8 + 33 + 8 + 8 + 8 + 1;

    fn flip_side(&self, flip_number: i64) -> Side {
        if flip_number == 0 {
            Side::Tails
        } else {
            Side::Heads
        }
    }
    fn flip(&self, player_seed: i64) -> Side {
        let clock: Clock = Clock::get().unwrap();
        let flip_number = (player_seed + self.vendor_seed + clock.unix_timestamp) % 2;

        self.flip_side(flip_number)
    }

    pub fn play(&mut self, player_seed: i64, player_side: Side) -> Pubkey {
        let flip_result = self.flip(player_seed);
        if flip_result == player_side {
            self.state = CoinFlipState::Finished {
                winner: self.players[1],
            };
            self.players[1]
        } else {
            self.state = CoinFlipState::Finished {
                winner: self.players[0],
            };
            self.players[0]
        }
    }
}

#[error_code]
pub enum CoinFlipError {
    #[msg("Bet amount is too small")]
    BetTooSmall,
}
