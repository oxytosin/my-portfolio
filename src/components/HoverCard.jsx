import { forwardRef } from 'react';

const HoverCard = forwardRef(function HoverCard(_, ref) {
  return (
    <div className="project-hover-card" ref={ref} id="hover-card">
      <img className="project-hover-card-img" id="hover-card-img" src="" alt="" />
      <div className="project-hover-card-body">
        <div className="project-hover-card-title" id="hover-card-title" />
        <div className="project-hover-card-meta" id="hover-card-meta" />
      </div>
    </div>
  );
});

export default HoverCard;
