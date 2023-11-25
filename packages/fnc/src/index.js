import { detectLanguage } from "@demo/dep";
import bin from "tiny-bin";

bin("detlang", "Detect the language of a string")
  .argument("[input]", "The input string")
  .action((_, args) => {
    console.log("Input string      : ", args[0]);
    console.log("Detected language : ", detectLanguage(args[0]));
  })
  .run();
