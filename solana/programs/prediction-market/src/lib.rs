use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("D254EggCVsZ7jKtJJ29diEv3P4qqjn5APBAvcRwDNsyE");

// ── Constants ──

pub const DISCRIMINATOR_SIZE: usize = 8;

// ── Error Codes ──

#[error_code]
pub enum MarketError {
    #[msg("Market is not open for joining")]
    MarketNotOpen,
    #[msg("Market is not locked")]
    MarketNotLocked,
    #[msg("Market is already settled")]
    MarketAlreadySettled,
    #[msg("Invalid side provided")]
    InvalidSide,
    #[msg("Stake must be greater than zero")]
    InvalidStake,
    #[msg("Participant already joined this market")]
    AlreadyJoined,
    #[msg("Payout already claimed")]
    AlreadyClaimed,
    #[msg("Not a winner")]
    NotWinner,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Only the creator can perform this action")]
    NotCreator,
}

// ── State ──

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, PartialEq)]
pub enum MarketType {
    TotalGoalsOverUnder,
    MatchWinner,
}

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, PartialEq)]
pub enum MarketStatus {
    Open,
    Locked,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, Copy, PartialEq)]
pub enum Side {
    Over,
    Under,
    Home,
    Away,
    Draw,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub creator: Pubkey,
    pub fixture_id: u64,
    pub market_type: MarketType,
    pub threshold: u64,
    pub status: MarketStatus,
    pub winner_side: Option<Side>,
    pub merkle_root: [u8; 32],
    pub total_over_stake: u64,
    pub total_under_stake: u64,
    pub total_home_stake: u64,
    pub total_away_stake: u64,
    pub total_draw_stake: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Participant {
    pub market: Pubkey,
    pub wallet: Pubkey,
    pub side: Side,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

// ── Instruction Params ──

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeMarketParams {
    pub fixture_id: u64,
    pub market_type: MarketType,
    pub threshold: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct JoinMarketParams {
    pub side: Side,
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SettleMarketParams {
    pub winner_side: Side,
    pub merkle_root: [u8; 32],
}

// ── Instruction Accounts ──

#[derive(Accounts)]
#[instruction(params: InitializeMarketParams)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = DISCRIMINATOR_SIZE + Market::INIT_SPACE,
        seeds = [b"market", creator.key().as_ref(), &params.fixture_id.to_le_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.creator.as_ref(), &market.fixture_id.to_le_bytes()],
        bump = market.bump,
        constraint = market.creator == creator.key() @ MarketError::NotCreator,
        constraint = market.status == MarketStatus::Open @ MarketError::MarketNotOpen,
    )]
    pub market: Account<'info, Market>,
}

#[derive(Accounts)]
#[instruction(params: JoinMarketParams)]
pub struct JoinMarket<'info> {
    #[account(mut)]
    pub participant_wallet: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.creator.as_ref(), &market.fixture_id.to_le_bytes()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Open @ MarketError::MarketNotOpen,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = participant_wallet,
        space = DISCRIMINATOR_SIZE + Participant::INIT_SPACE,
        seeds = [b"participant", market.key().as_ref(), participant_wallet.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, Participant>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.creator.as_ref(), &market.fixture_id.to_le_bytes()],
        bump = market.bump,
        constraint = market.creator == creator.key() @ MarketError::NotCreator,
        constraint = market.status == MarketStatus::Locked @ MarketError::MarketNotLocked,
    )]
    pub market: Account<'info, Market>,
}

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market.creator.as_ref(), &market.fixture_id.to_le_bytes()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Settled @ MarketError::MarketAlreadySettled,
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"participant", market.key().as_ref(), claimer.key().as_ref()],
        bump = participant.bump,
        constraint = !participant.claimed @ MarketError::AlreadyClaimed,
    )]
    pub participant: Account<'info, Participant>,

    pub system_program: Program<'info, System>,
}

// ── Program ──

#[program]
pub mod prediction_market {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        params: InitializeMarketParams,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;

        market.creator = ctx.accounts.creator.key();
        market.fixture_id = params.fixture_id;
        market.market_type = params.market_type;
        market.threshold = params.threshold;
        market.status = MarketStatus::Open;
        market.winner_side = None;
        market.merkle_root = [0u8; 32];
        market.total_over_stake = 0;
        market.total_under_stake = 0;
        market.total_home_stake = 0;
        market.total_away_stake = 0;
        market.total_draw_stake = 0;
        market.bump = ctx.bumps.market;

        Ok(())
    }

    pub fn lock_market(ctx: Context<LockMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.status = MarketStatus::Locked;
        Ok(())
    }

    pub fn join_market(
        ctx: Context<JoinMarket>,
        params: JoinMarketParams,
    ) -> Result<()> {
        require!(params.amount > 0, MarketError::InvalidStake);

        let market = &mut ctx.accounts.market;
        let participant = &mut ctx.accounts.participant;

        participant.market = market.key();
        participant.wallet = ctx.accounts.participant_wallet.key();
        participant.side = params.side;
        participant.amount = params.amount;
        participant.claimed = false;
        participant.bump = ctx.bumps.participant;

        match params.side {
            Side::Over => market.total_over_stake = market.total_over_stake.checked_add(params.amount).ok_or(MarketError::Overflow)?,
            Side::Under => market.total_under_stake = market.total_under_stake.checked_add(params.amount).ok_or(MarketError::Overflow)?,
            Side::Home => market.total_home_stake = market.total_home_stake.checked_add(params.amount).ok_or(MarketError::Overflow)?,
            Side::Away => market.total_away_stake = market.total_away_stake.checked_add(params.amount).ok_or(MarketError::Overflow)?,
            Side::Draw => market.total_draw_stake = market.total_draw_stake.checked_add(params.amount).ok_or(MarketError::Overflow)?,
        }

        // Transfer SOL stake from participant to market vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.participant_wallet.to_account_info(),
                    to: ctx.accounts.market.to_account_info(),
                },
            ),
            params.amount,
        )?;

        Ok(())
    }

    pub fn settle_market(
        ctx: Context<SettleMarket>,
        params: SettleMarketParams,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;

        market.status = MarketStatus::Settled;
        market.winner_side = Some(params.winner_side);
        market.merkle_root = params.merkle_root;

        Ok(())
    }

    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        let market = &ctx.accounts.market;
        let participant = &mut ctx.accounts.participant;

        let winner_side = market.winner_side.as_ref().ok_or(MarketError::NotWinner)?;
        require!(*winner_side == participant.side, MarketError::NotWinner);
        require!(!participant.claimed, MarketError::AlreadyClaimed);

        // Payout: 2x stake (simple even odds for MVP)
        let payout = participant.amount.checked_mul(2).ok_or(MarketError::Overflow)?;

        // Verify vault has enough SOL
        let market_info = ctx.accounts.market.to_account_info();
        let vault_balance = market_info.lamports();
        require!(vault_balance >= payout, MarketError::Overflow);

        // Transfer lamports directly (PDA has data, so system_program::transfer won't work)
        **market_info.try_borrow_mut_lamports()? = market_info
            .lamports()
            .checked_sub(payout)
            .ok_or(MarketError::Overflow)?;

        let claimer_info = ctx.accounts.claimer.to_account_info();
        **claimer_info.try_borrow_mut_lamports()? = claimer_info
            .lamports()
            .checked_add(payout)
            .ok_or(MarketError::Overflow)?;

        participant.claimed = true;

        Ok(())
    }
}
