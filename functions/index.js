const functions = require("firebase-functions");
const admin = require("firebase-admin");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

admin.initializeApp();

exports.createUserProfile = functions.https.onCall(async (data, context) => {
  checkAuthentication(context);
  dataValidator(data, {
    username: "string"
  });

  const db = admin.firestore();

  // Check if the user already has a profile
  const userProfile = await db
    .collection("publicProfiles")
    .where("userId", "==", context.auth.uid)
    .limit(1)
    .get();
  if (!userProfile.empty) {
    throw new functions.https.HttpsError("already-exists", "This user already has a public profile.");
  }

  // Check if the uesrname exists
  const publicProfile = await db
    .collection("publicProfiles")
    .doc(data.username)
    .get();
  if (publicProfile.exists) {
    throw new functions.https.HttpsError("already-exists", "This username is already in use.");
  }

  return db
    .collection("publicProfiles")
    .doc(data.username)
    .set({ userId: context.auth.uid });
});

exports.postComment = functions.https.onCall((data, context) => {
  checkAuthentication(context);
  dataValidator(data, {
    bookId: "string",
    text: "string"
  });
  const db = admin.firestore();
  return db
    .collection("publicProfiles")
    .where("userId", "==", context.auth.uid)
    .limit(1)
    .get()
    .then(snapshot => {
      return db.collection("comments").add({
        username: snapshot.docs[0].id,
        text: data.text,
        dateCreated: new Date(),
        book: db.collection("books").doc(data.bookId)
      });
    });
});

function dataValidator(data, validKeys) {
  if (Object.keys(data).length !== Object.keys(validKeys).length) {
    throw new functions.https.HttpsError("invalid-argument", "Data object contains invalid number of properties");
  } else {
    for (let key in data) {
      if (!validKeys[key] || data[key] !== validKeys[key]) {
        throw new functions.https.HttpsError("invalid-argument", "Data object contains invalid properties");
      }
    }
  }
}

function checkAuthentication(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must to be logged in to use that feature.");
  }
}
