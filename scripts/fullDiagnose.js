const mongoose = require('mongoose');
require('dotenv').config();

// Use MONGO_URL from .env and add database name
const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/voteon';
const connectionString = mongoUri.endsWith('/') ? mongoUri + 'voteon' : mongoUri;

console.log('🔗 Connecting to:', connectionString.replace(/:[^:@]+@/, ':****@'));
mongoose.connect(connectionString);

const Student = require('../models/student/student');
const Election = require('../models/Election/Election');

async function fullDiagnose() {
  try {
    console.log('\n COMPLETE DATABASE DIAGNOSTIC\n');
    console.log('='.repeat(70));
    
    // 1. Count all students
    const totalStudents = await Student.countDocuments();
    console.log(`\n1️  TOTAL STUDENTS: ${totalStudents}\n`);
    
    if (totalStudents > 0) {
      // Show first 10 students
      const students = await Student.find().limit(10);
      console.log('   First 10 students:');
      students.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.name} (${s.admissionNumber})`);
        console.log(`      hasWon: ${s.hasWon}, isCollegeCandidate: ${s.isCollegeCandidate}`);
        console.log(`      votesCount: ${s.votesCount}, position: ${s.position || 'none'}`);
      });
      console.log('');
    }
    
    // 2. Count students by status
    const candidates = await Student.countDocuments({ iscandidate: true });
    const approved = await Student.countDocuments({ isApproved: true });
    const winners = await Student.countDocuments({ hasWon: true });
    const collegeCandidates = await Student.countDocuments({ isCollegeCandidate: true });
    
    console.log('\n2️⃣  STUDENT STATISTICS:\n');
    console.log(`   Total students: ${totalStudents}`);
    console.log(`   Candidates (iscandidate=true): ${candidates}`);
    console.log(`   Approved candidates: ${approved}`);
    console.log(`   Winners (hasWon=true): ${winners}`);
    console.log(`   College candidates: ${collegeCandidates}\n`);
    
    // 3. Count all elections
    const totalElections = await Election.countDocuments();
    console.log(`\n3️⃣  TOTAL ELECTIONS: ${totalElections}\n`);
    
    if (totalElections > 0) {
      const elections = await Election.find();
      console.log('   All elections:');
      elections.forEach((e, i) => {
        console.log(`\n   ${i + 1}. "${e.title}"`);
        console.log(`      Type: ${e.type}, Status: ${e.status}`);
        console.log(`      Candidates: ${e.candidates.length}, Total Votes: ${e.totalVotes || 0}`);
        console.log(`      Winner: ${e.winner ? 'Set' : 'Not set'}`);
      });
      console.log('');
    }
    
    // 4. Count elections by status
    const activeElections = await Election.countDocuments({ status: 'Active' });
    const completedElections = await Election.countDocuments({ status: 'Completed' });
    const scheduledElections = await Election.countDocuments({ status: 'Scheduled' });
    
    console.log('\n4️⃣  ELECTION STATISTICS:\n');
    console.log(`   Total elections: ${totalElections}`);
    console.log(`   Active: ${activeElections}`);
    console.log(`   Completed: ${completedElections}`);
    console.log(`   Scheduled: ${scheduledElections}\n`);
    
    // 5. Search for specific names
    console.log('\n5️⃣  SEARCHING FOR SPECIFIC STUDENTS:\n');
    
    const shahanaVariants = await Student.find({ 
      name: { $regex: /shahana/i } 
    });
    console.log(`   Students matching "shahana": ${shahanaVariants.length}`);
    shahanaVariants.forEach(s => {
      console.log(`      - ${s.name} (${s.admissionNumber})`);
    });
    
    const ahamedVariants = await Student.find({ 
      name: { $regex: /ahamed|ahmed|kabir/i } 
    });
    console.log(`\n   Students matching "ahamed/kabir": ${ahamedVariants.length}`);
    ahamedVariants.forEach(s => {
      console.log(`      - ${s.name} (${s.admissionNumber})`);
    });
    
    // 6. Check database name
    console.log('\n\n6️⃣  DATABASE INFO:\n');
    console.log(`   Database name: ${mongoose.connection.name}`);
    console.log(`   Connection state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected'}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Full diagnostic complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

fullDiagnose();
