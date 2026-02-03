const mongoose = require('mongoose');
require('dotenv').config();

// Use MONGO_URL from .env and add database name
const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/voteon';
const connectionString = mongoUri.endsWith('/') ? mongoUri + 'voteon' : mongoUri;

console.log('🔗 Connecting to MongoDB Atlas...');
mongoose.connect(connectionString);
const Student = require('../models/student/student');
const Election = require('../models/Election/Election');

/**
 * This script automatically fixes existing class election winners
 * by finding their actual vote counts from completed elections
 * and updating their student records.
 */
async function fixExistingWinners() {
  try {
    console.log('🔍 Finding completed class elections with winners...\n');
    
    // Find all completed class elections that have a winner
    const completedElections = await Election.find({
      type: 'class',
      status: 'Completed',
      winner: { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${completedElections.length} completed class elections\n`);

    if (completedElections.length === 0) {
      console.log('⚠️  No completed class elections found.');
      console.log('   Make sure you have ended at least one class election.\n');
      return;
    }

    let fixedCount = 0;
    let alreadyCorrect = 0;

    for (const election of completedElections) {
      console.log(`📋 Processing: "${election.title}"`);
      console.log(`   Status: ${election.status}`);
      console.log(`   Position: ${election.position}`);
      console.log(`   Candidates: ${election.candidates.length}`);

      if (!election.winner) {
        console.log(`   ⚠️  No winner set, skipping\n`);
        continue;
      }

      // Find the winner's candidate entry in this election
      const winnerCandidate = election.candidates.find(c => 
        c.student.toString() === election.winner.toString()
      );

      if (!winnerCandidate) {
        console.log(`   ⚠️  Winner not found in candidates array, skipping\n`);
        continue;
      }

      const winnerId = election.winner;
      const actualVotes = winnerCandidate.votesCount || 0;

      // Get the student
      const student = await Student.findById(winnerId);
      
      if (!student) {
        console.log(`   ⚠️  Student not found for winner ID, skipping\n`);
        continue;
      }

      console.log(`   🏆 Winner: ${student.name} (${student.admissionNumber})`);
      console.log(`   📊 Current student record:`);
      console.log(`      votesCount: ${student.votesCount}`);
      console.log(`      position: ${student.position || 'not set'}`);
      console.log(`      hasWon: ${student.hasWon}`);
      console.log(`      isCollegeCandidate: ${student.isCollegeCandidate}`);
      console.log(`   📊 Election data:`);
      console.log(`      Actual votes received: ${actualVotes}`);
      console.log(`      Position: ${election.position}`);

      // Check if already correct
      if (student.votesCount === actualVotes && 
          student.position === election.position && 
          student.hasWon === true && 
          student.isCollegeCandidate === true) {
        console.log(`   ✅ Already correct, no update needed\n`);
        alreadyCorrect++;
        continue;
      }

      // Update the student
      student.votesCount = actualVotes;
      student.position = election.position;
      student.hasWon = true;
      student.isCollegeCandidate = true;
      
      await student.save();
      
      console.log(`   ✨ UPDATED successfully!`);
      console.log(`      New votesCount: ${student.votesCount}`);
      console.log(`      New position: ${student.position}\n`);
      fixedCount++;
    }

    console.log('═'.repeat(60));
    console.log(`\n📈 Summary:`);
    console.log(`   Total elections processed: ${completedElections.length}`);
    console.log(`   Winners updated: ${fixedCount}`);
    console.log(`   Already correct: ${alreadyCorrect}`);
    
    // Show all current winners
    console.log(`\n📋 All class election winners:\n`);
    const allWinners = await Student.find({ hasWon: true });
    
    if (allWinners.length === 0) {
      console.log('   No winners found in database\n');
    } else {
      allWinners.forEach((w, index) => {
        console.log(`   ${index + 1}. ${w.name} (${w.admissionNumber})`);
        console.log(`      Votes: ${w.votesCount}`);
        console.log(`      Position: ${w.position || 'Not set'}`);
        console.log(`      College Candidate: ${w.isCollegeCandidate ? 'Yes' : 'No'}`);
        console.log(`      Class: ${w.className} ${w.section || ''}`);
        console.log('');
      });
    }

    console.log('✅ Fix complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the script
console.log('🚀 Starting winner vote count fix...\n');
fixExistingWinners();
