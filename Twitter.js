import axios from "axios";
import { createSpinner } from "nanospinner";
import { HeadersConfig } from "./constants/HeadersConfig.js";
import URLs from "./constants/URLs.js";
import FFmpegm3uToMp4 from "./utils/FFmpegm3uToMp4.js";
import { GetSpaceIDPropmpt } from "./utils/Inquirers/index.js";
import { logFail, logProgress } from "./utils/Loggers/index.js";

class Twitter {
  #config;
  #AxiosT;
  Title;
  constructor() {
    this.#config = HeadersConfig;
    this.#AxiosT = axios.create(this.#config);
  }
  start() {
    // 1RDGlgrMdPoKL

    this.#GetGuestToken();
  }
  #GetGuestToken = async () => {
    // Generate Guest Token
    const spinner = createSpinner("Generating A Guest...").start();
    const {
      data: { guest_token = "" },
    } = await this.#AxiosT.post(URLs.GhostTokenURL);

    if (!guest_token)
      return (
        spinner.error({ text: "Faild to generate guest token." }),
        process.exit(1)
      );
    this.#config.headers["X-Guest-Token"] = guest_token;
    this.#AxiosT = axios.create(this.#config); // update axios headers
    spinner.success({ text: "Guest token was craeted successfully!" });
    return this.#getID();
  };
  #getID = async () => {
    // Get SpaceID user Input
    const SpaceID = await GetSpaceIDPropmpt();
    if (!SpaceID) return logFail("Invalid Space ID");
    logProgress("Valid Space ID: " + SpaceID);
    return this.#getSpaceMetas(SpaceID);
  };
  #getSpaceMetas = async (spaceID) => {
    // fetch media key
    const MediakeySpinner = createSpinner("Fetching Media Key...");
    MediakeySpinner.start();
    const { media_key = "", title = "" } = await this.#AxiosT
      .get(URLs.SpaceGraphQLQueryURL.replace("spaceID", spaceID))
      .then((res) => res.data.data.audioSpace.metadata);

    if (!media_key)
      return MediakeySpinner.stop({ text: "Failed to get Space Media Key" });
    MediakeySpinner.success({
      text: "Success Fetch of Media Key: " + media_key,
    });
    this.Title = title;
    return this.#fetchStream(media_key);
  };
  #fetchStream = async (media_key) => {
    const spaceSRCSpinner = createSpinner("Fetching Space details...").start();
    const {
      data: {
        source: { noRedirectPlaybackUrl: spaceSRC = "" },
      },
    } = await this.#AxiosT.get(URLs.SpaceSRCURL + media_key);

    if (!spaceSRC)
      spaceSRCSpinner.stop({ text: "Fetching Space details Fialed" });
    spaceSRCSpinner.success({ text: "Successful Space details fetched" });
    return this.#StartFFmpeg(spaceSRC);
  };
  #StartFFmpeg = async (spaceMu) => {
    const SpaceFFmpeg = new FFmpegm3uToMp4({
      InputFile: spaceMu,
      OutputFile: this.Title + " TwitterSpace.mp4",
      Headers: this.#config.headers,
    });
    await SpaceFFmpeg.start();
    process.exit(0);
  };
}

export default Twitter;
