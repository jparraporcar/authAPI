const mongoose = require("mongoose");
const User = require("../models/user");
const { validationResult } = require("express-validator");
const bcryptjs = require("bcryptjs");
const passwordValidator = require("password-validator");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res, next) => {
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  const password = req.body.password;
  const confPassword = req.body.confPassword;
  const errors = validationResult(req);
  let user;
  var schema = new passwordValidator();
  schema.is().min(8).has().uppercase().has().lowercase();

  if (
    !errors.isEmpty() ||
    !schema.validate(password) ||
    password != confPassword
  ) {
    const error = new Error("Validation failed");
    error.statusCode = 422;
    error.data = {
      userDataValidationError: errors.array(),
      passwordValidationError: schema.validate(password, { list: true }),
      passwordConfirmationDoesNotMatch: password != confPassword,
    };
    return next(error);
  }

  try {
    const userFound = await User.findOne({ email: email });
    if (userFound) {
      const error = new Error(
        "The user email already exists please introduce another email"
      );
      error.statusCode = 409;
      return next(error);
    }
    const hashedPassword = await bcryptjs.hash(password, 12);
    let user = new User({
      // _id: new mongoose.Types.ObjectId("60d49e4dc1b50e2e8e60daea"), //force error in the database
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: hashedPassword,
      confPassword: hashedPassword,
    });
    const newUser = await user.save();
    res.status(201).json({
      message: `The new user Mr/Ms ${newUser.lastName} has been stored in the DB`,
    });
  } catch {
    const error = new Error(
      "A problem has occured while storing the user in the DB, we are working on solving it"
    );
    error.statusCode = 500;
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let userFound;
  try {
    let userFound = await User.findOne({ email: email });
    if (!userFound) {
      const error = new Error("The user does not exist");
      error.statusCode = 404;
      return next(error);
    }

    const isEqual = await bcryptjs.compare(password, userFound.password);
    if (!isEqual) {
      const error = new Error("The password introduced is incorrect");
      error.statusCode = 401;
      return next(error);
    }
    const token = await jwt.sign(
      {
        id: userFound._id.toString(),
        email: userFound.email,
      },
      "secretsecretsecret",
      { expiresIn: "1h" }
    );
    res
      .status(200)
      .json({ message: "The user has been authenticated", token: token });
  } catch {
    const error = new Error(
      "A problem has occured in the DB, we are working on solving it"
    );
    error.statusCode = 500;
    return next(error);
  }
};
