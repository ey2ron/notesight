import { Navigation } from "../../components/Navigation/Navigation";

export function Features() {
  return (
    <div className="about-container">
        <Navigation />
      <h1>About NoteSight</h1>
      <p>NoteSight is an innovative application designed to help musicians and music enthusiasts read and interpret sheet music with ease. Our cutting-edge Optical Music Recognition (OMR) technology allows users to upload images of sheet music and instantly hear the corresponding audio playback.</p>
      <p>Whether you're a beginner looking to learn music or a seasoned musician seeking a quick way to preview compositions, NoteSight is here to assist you. Our mission is to make music more accessible and enjoyable for everyone.</p>
      <h2>Features</h2>
      <ul>
        <li>Instant audio playback of uploaded sheet music</li>
        <li>Support for various musical notations and symbols</li>
        <li>User-friendly interface for easy navigation</li>
        <li>Secure and private handling of user data</li>
      </ul>
    </div>
  );
}
