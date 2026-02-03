const mongoose = require('mongoose');
require('dotenv').config();

// Use MONGO_URL from .env and add database name
const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/voteon';
const connectionString = mongoUri.endsWith('/') ? mongoUri + 'voteon' : mongoUri;

console.log('🔗 Connecting to:', connectionString.replace(/:[^:@]+@/, ':****@'));
mongoose.connect(connectionString);

const Student = require('../models/student/student');
const Election = require('../models/Election/Election');

async function diagnose() {
  try {
    console.log(' DIAGNOSTIC REPORT\n');
    console.log('='.repeat(70));
    
    // 1. Check all students with hasWon: true
    console.log('\n1️⃣  STUDENTS WITH hasWon=true:\n');
    const winners = await Student.find({ hasWon: true });
    
    if (winners.length === 0) {
      console.log('   ⚠️  No students found with hasWon=true\n');
    } else {
      winners.forEach((w, i) => {
        console.log(`   ${i + 1}. ${w.name} (${w.admissionNumber})`);
        console.log(`      ID: ${w._id}`);
        console.log(`      votesCount: ${w.votesCount}`);
        console.log(`      position: ${w.position || 'NOT SET'}`);
        console.log(`      isCollegeCandidate: ${w.isCollegeCandidate}`);
        console.log(`      className: ${w.className} ${w.section || ''}`);
        console.log('');
      });
    }

    // 2. Check all elections
    console.log('\n2️⃣  ALL ELECTIONS:\n');
    const allElections = await Election.find({});
    
    if (allElections.length === 0) {
      console.log('   ⚠️  No elections found in database\n');
    } else {
      console.log(`   Total elections: ${allElections.length}\n`);
      
      allElections.forEach((e, i) => {
        console.log(`   ${i + 1}. "${e.title}"`);
        console.log(`      ID: ${e._id}`);
        console.log(`      Type: ${e.type}`);
        console.log(`      Status: ${e.status}`);
        console.log(`      Position: ${e.position || 'not set'}`);
        console.log(`      Candidates: ${e.candidates.length}`);
        console.log(`      Total Votes: ${e.totalVotes || 0}`);
        console.log(`      Winner: ${e.winner ? e.winner : 'Not set'}`);
        
        if (e.candidates.length > 0) {
          console.log(`      Candidate votes:`);
          e.candidates.forEach(c => {
            console.log(`         - ${c.student}: ${c.votesCount} votes`);
          });
        }
        console.log('');
      });
    }

    // 3. Check specifically for Shahana and Ahamed Kabir
    console.log('\n3️⃣  SPECIFIC STUDENTS (Shahana, Ahamed Kabir):\n');
    
    const shahana = await Student.findOne({ name: /shahana/i });
    const ahamed = await Student.findOne({ name: /ahamed.*kabir/i });
    
    if (shahana) {
      console.log(`   📝 Shahana:`);
      console.log(`      ID: ${shahana._id}`);
      console.log(`      Admission: ${shahana.admissionNumber}`);
      console.log(`      votesCount: ${shahana.votesCount}`);
      console.log(`      position: ${shahana.position || 'NOT SET'}`);
      console.log(`      hasWon: ${shahana.hasWon}`);
      console.log(`      isCollegeCandidate: ${shahana.isCollegeCandidate}`);
      console.log('');
    } else {
      console.log(`   ⚠️  Shahana not found\n`);
    }
    
    if (ahamed) {
      console.log(`   📝 Ahamed Kabir:`);
      console.log(`      ID: ${ahamed._id}`);
      console.log(`      Admission: ${ahamed.admissionNumber}`);
      console.log(`      votesCount: ${ahamed.votesCount}`);
      console.log(`      position: ${ahamed.position || 'NOT SET'}`);
      console.log(`      hasWon: ${ahamed.hasWon}`);
      console.log(`      isCollegeCandidate: ${ahamed.isCollegeCandidate}`);
      console.log('');
    } else {
      console.log(`   ⚠️  Ahamed Kabir not found\n`);
    }

    // 4. Check elections involving these students
    console.log('\n4️⃣  ELECTIONS INVOLVING SHAHANA/AHAMED:\n');
    
    if (shahana || ahamed) {
      const studentIds = [shahana?._id, ahamed?._id].filter(Boolean);
      const theirElections = await Election.find({
        'candidates.student': { $in: studentIds }
      });
      
      if (theirElections.length === 0) {
        console.log('   ⚠️  No elections found for these students\n');
      } else {
        theirElections.forEach((e, i) => {
          console.log(`   ${i + 1}. "${e.title}"`);
          console.log(`      Status: ${e.status}`);
          console.log(`      Position: ${e.position}`);
          console.log(`      Winner: ${e.winner || 'Not set'}`);
          console.log(`      Candidates:`);
          
          e.candidates.forEach(c => {
            const isTarget = studentIds.some(id => id.equals(c.student));
            const marker = isTarget ? '⭐' : '  ';
            console.log(`      ${marker} ${c.student}: ${c.votesCount} votes`);
          });
          console.log('');
        });
      }
    }

    console.log('='.repeat(70));
    console.log('\n✅ Diagnostic complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

diagnose();
