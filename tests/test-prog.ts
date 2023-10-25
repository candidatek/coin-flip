import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
const fs = require('fs');
import CoinFlip from "../target/idl/coin_flip.json";
import * as anchor from "@coral-xyz/anchor";
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey';
import { expect } from "chai";


describe('Account data', () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("3XgEAxN3vcg3g6rvXRgnT8o61zhcx611MHKjG4yLfJqm"); // Replace with your deployed program ID
  const keypairRaw = fs.readFileSync('/Users/shrihari/.config/solana/id.json', 'utf8');
  const playerRaw = fs.readFileSync('/Users/shrihari/Documents/Learn/sol-flip/tests/HARi.json', 'utf8');
  const playerKeyPair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(playerRaw)));
  const player: anchor.Wallet = new anchor.Wallet(playerKeyPair);
  const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(keypairRaw)));
  const vendor: anchor.Wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, vendor, {});
  const program: anchor.Program = new anchor.Program(CoinFlip as any, programId, provider);

  function programForUser(user) {
    return new anchor.Program(program.idl, program.programId, user.provider);
  }


  async function play(provider, program, coinFlip, playerOne, playerTwo) {
    const playerChoice = 0;
    const randomSeed = new anchor.BN(Math.floor(Math.random() * 100000));

    const tx = await program.methods
      .play(playerChoice, randomSeed)
      .accounts({
        vendor: playerOne.publicKey,
        player: playerTwo.publicKey,
        coinFlip,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([playerOne.payer, playerTwo.payer])
      .rpc();

    console.log(tx)

    const gameState = await program.account.coinFlip.fetch(coinFlip);
    console.log("playerTwo: ", playerTwo.publicKey.toString());
    console.log("Winner:", gameState.state.finished.winner.toString());
    console.log({ gameState: gameState.players });
    await provider.connection.confirmTransaction(tx);
  }

  // it('first setup', async () => {

  //   const vendorBalanceAfterFlip = await provider.connection.getAccountInfo(vendor.publicKey);
  //   console.log("vendor Balance Before Flip", vendorBalanceAfterFlip.lamports / LAMPORTS_PER_SOL, ' SOL');
  //   const playerBalance = await provider.connection.getAccountInfo(player.publicKey);
  //   console.log("player Balance", playerBalance.lamports / LAMPORTS_PER_SOL, ' SOL');

  //   const vendorProgram = program;// programForUser(vendor);
  //   const [coinFlipPDA, _] = findProgramAddressSync(
  //     [Buffer.from("coin-flip4"), vendor.publicKey.toBuffer(), player.publicKey.toBuffer()],
  //     program.programId
  //   )
  //   console.log(coinFlipPDA.toBase58())

  //   const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
  //   const randomSeed = new anchor.BN(Math.floor(Math.random() * 100000));

  //   await vendorProgram
  //     .methods
  //     .setup(player.publicKey, betAmount, randomSeed)
  //     .accounts({
  //       coinFlip: coinFlipPDA,
  //       vendor: vendor.publicKey,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //     })
  //     .signers([vendor.payer])
  //     .rpc()

  //   const gameState = await program.account.coinFlip.fetch(coinFlipPDA);
  //   expect(gameState.players[0].toString()).to.be.equal(vendor.publicKey.toString());
  //   expect(gameState.players[1].toString()).to.be.equal(player.publicKey.toString());
  //   expect(gameState.vendorSeed.toString()).to.be.equal(randomSeed.toString());
  // });


  it('plays the game ', async () => {

    const vendorProgram = program;// programForUser(vendor);
    const playerProvider = new anchor.AnchorProvider(connection, player, {});
    const playerProgram: anchor.Program = new anchor.Program(CoinFlip as any, programId, playerProvider);

    const vendorBalanceBeforeFlip = await provider.connection.getAccountInfo(vendor.publicKey);
    console.log("vendorBalanceBeforeFlip", vendor.publicKey, vendorBalanceBeforeFlip.lamports / LAMPORTS_PER_SOL);

    const playerBalanceBeforeFlip = await provider.connection.getAccountInfo(player.publicKey);
    console.log("playerBalanceBeforeFlip ", player.publicKey, playerBalanceBeforeFlip.lamports / LAMPORTS_PER_SOL);

    const [coinFlipPDA, _] = findProgramAddressSync(
      [Buffer.from("coin-flip4"), vendor.publicKey.toBuffer(), player.publicKey.toBuffer()],
      program.programId
    )

    console.log(coinFlipPDA.toBase58())
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);
    const randomSeed = new anchor.BN(Math.floor(Math.random() * 100000));
    // await vendorProgram
    //   .methods
    //   .setup(player.publicKey, betAmount, randomSeed)
    //   .accounts({
    //     coinFlip: coinFlipPDA,
    //     vendor: vendor.publicKey,
    //     systemProgram: anchor.web3.SystemProgram.programId,
    //   })
    //   .signers([vendor.payer])
    //   .rpc()
    console.log('step 1')
    await play(provider, playerProgram, coinFlipPDA, vendor, player);



    const gameState = await program.account.coinFlip.fetch(coinFlipPDA);

    expect(gameState.players[0].toString()).to.be.equal(vendor.publicKey.toString());
    expect(gameState.players[1].toString()).to.be.equal(player.publicKey.toString());

    const vendorBalanceAfterFlip = await provider.connection.getAccountInfo(vendor.publicKey);
    console.log("vendorBalanceAfterFlip", vendorBalanceAfterFlip.lamports / LAMPORTS_PER_SOL);

    const playerBalanceAfterFlip = await provider.connection.getAccountInfo(player.publicKey);
    console.log("playerBalanceAfterFlip", playerBalanceAfterFlip.lamports / LAMPORTS_PER_SOL);
  })


});






// const [pageVisitPDA] = PublicKey.findProgramAddressSync(
//   [Buffer.from("page_visits"), wallet.publicKey.toBuffer()],
//   programId
// )
// console.log('pageVisitPDA -> ', pageVisitPDA.toBase58())
// // it('should create a page visit account', async () => {
// //   await program.methods
// //     .createPageVisits()
// //     .accounts({
// //       payer: wallet.publicKey,
// //       pageVisits: pageVisitPDA,
// //     })
// //     .rpc()
// // })

// it('Visit the page!', async () => {
//   await program.methods
//     .incrementPageVisits()
//     .accounts({
//       user: wallet.publicKey,
//       pageVisits: pageVisitPDA,
//     })
//     .rpc()
// })

// it('Visit the page 2', async () => {
//   await program.methods.incrementPageVisits()
//     .accounts({
//       user: wallet.publicKey,
//       pageVisits: pageVisitPDA,
//     }).rpc()
// })




// it('should get the page visit account', async () => {
//   const pageVisits = await program.account.pageVisits.fetch(pageVisitPDA);
//   console.log(`Number of page visits: ${pageVisits.pageVisits}`)
//   console.log(`Object page visits: ${pageVisits.bump}`)
// });